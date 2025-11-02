import os
from datetime import datetime
from flask import Flask, request, jsonify, send_file # Make sure send_file is imported
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import io
from pypdf import PdfReader, PdfWriter # Make sure PdfWriter is imported

app = Flask(__name__)
CORS(app) 

#postgresql creds
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_NAME = os.environ.get('DB_NAME', 'tax_filler_db')

#sqlalchemy
app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database extension
db = SQLAlchemy(app)

# --- Database Models (Schema) ---

class Entity(db.Model):
    """
    Model for storing entity information (companies/individuals).
    """
    __tablename__ = 'entities'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    street_address = db.Column(db.String(255))
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    zip_code = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_field(self, field_name):
        """Gets an entity attribute by its string name."""
        return getattr(self, field_name, None)

    def to_dict(self):
        """Serializes the object to a dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'street_address': self.street_address,
            'city': self.city,
            'state': self.state,
            'zip_code': self.zip_code,
            'created_at': self.created_at.isoformat()
        }

class PdfForm(db.Model):
    """
    Model for storing uploaded PDF form templates.
    """
    __tablename__ = 'pdf_forms'
    
    id = db.Column(db.Integer, primary_key=True)
    form_name = db.Column(db.String(255), nullable=False, unique=True)
    # Storing file data as 'LargeBinary' (BLOB)
    file_data = db.Column(db.LargeBinary, nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Serializes the object to a dictionary (without file_data)."""
        return {
            'id': self.id,
            'form_name': self.form_name,
            'uploaded_at': self.uploaded_at.isoformat()
        }

class FieldMapping(db.Model):
    """
    Model for mapping entity fields to PDF form fields.
    """
    __tablename__ = 'field_mappings'
    
    id = db.Column(db.Integer, primary_key=True)
    # Foreign Key to link to the pdf_forms table
    form_id = db.Column(db.Integer, db.ForeignKey('pdf_forms.id'), nullable=False)
    pdf_field_name = db.Column(db.String(255), nullable=False) # e.g., "top_name_field"
    entity_field_name = db.Column(db.String(100), nullable=False) # e.g., "name"
    
    # Relationship (optional but useful)
    form = db.relationship('PdfForm', backref=db.backref('mappings', lazy=True, cascade="all, delete-orphan"))     

    def to_dict(self):
        return {
            'id': self.id,
            'form_id': self.form_id,
            'pdf_field_name': self.pdf_field_name,
            'entity_field_name': self.entity_field_name
        }

#debug route
@app.route('/')
def home():
    return "Hello, Tax Filler Backend is running!"

# --- API Endpoints for Entities (CRUD) ---
# ... (create_entity, get_all_entities, get_entity, update_entity, delete_entity) ...
@app.route('/api/entities', methods=['POST'])
def create_entity():
    """Creates a new entity."""
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    new_entity = Entity(
        name=data.get('name'),
        street_address=data.get('street_address'),
        city=data.get('city'),
        state=data.get('state'),
        zip_code=data.get('zip_code')
    )
    db.session.add(new_entity)
    db.session.commit()
    return jsonify(new_entity.to_dict()), 201

@app.route('/api/entities', methods=['GET'])
def get_all_entities():
    """Gets all entities."""
    entities = Entity.query.order_by(Entity.name).all()
    return jsonify([entity.to_dict() for entity in entities]), 200

@app.route('/api/entities/<int:id>', methods=['GET'])
def get_entity(id):
    """Gets a single entity by its ID."""
    entity = db.session.get(Entity, id)
    if entity:
        return jsonify(entity.to_dict()), 200
    else:
        return jsonify({'error': 'Entity not found'}), 404

@app.route('/api/entities/<int:id>', methods=['PUT'])
def update_entity(id):
    """Updates an existing entity."""
    entity = db.session.get(Entity, id)
    if not entity:
        return jsonify({'error': 'Entity not found'}), 404
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    entity.name = data.get('name', entity.name)
    entity.street_address = data.get('street_address', entity.street_address)
    entity.city = data.get('city', entity.city)
    entity.state = data.get('state', entity.state)
    entity.zip_code = data.get('zip_code', entity.zip_code)
    db.session.commit()
    return jsonify(entity.to_dict()), 200

@app.route('/api/entities/<int:id>', methods=['DELETE'])
def delete_entity(id):
    """Deletes an entity."""
    entity = db.session.get(Entity, id)
    if not entity:
        return jsonify({'error': 'Entity not found'}), 404
    db.session.delete(entity)
    db.session.commit()
    return jsonify({'message': 'Entity deleted successfully'}), 200


# --- API Endpoints for PDF Forms ---
# ... (upload_form, get_all_forms, get_form_fields) ...
@app.route('/api/forms/upload', methods=['POST'])
def upload_form():
    """Uploads a new PDF form template."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    form_name = request.form.get('form_name')
    if not form_name:
        return jsonify({'error': 'Form name is required'}), 400
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and file.filename.endswith('.pdf'):
        existing_form = PdfForm.query.filter_by(form_name=form_name).first()
        if existing_form:
            return jsonify({'error': 'A form with this name already exists'}), 409
        file_data = file.read()
        new_form = PdfForm(form_name=form_name, file_data=file_data)
        db.session.add(new_form)
        db.session.commit()
        return jsonify(new_form.to_dict()), 201
    else:
        return jsonify({'error': 'Invalid file type, only PDF allowed'}), 400

@app.route('/api/forms', methods=['GET'])
def get_all_forms():
    """Gets all uploaded PDF forms (metadata only)."""
    forms = PdfForm.query.order_by(PdfForm.form_name).all()
    return jsonify([form.to_dict() for form in forms]), 200

@app.route('/api/forms/<int:id>/fields', methods=['GET'])
# In tax_form_app/app.py

@app.route('/api/forms/<int:id>/fields', methods=['GET'])
def get_form_fields(id):
    """
    Retrieves all fillable field names and their alternate names (tooltips)
    from a specific PDF form.
    """
    form = db.session.get(PdfForm, id)
    if not form:
        return jsonify({'error': 'Form not found'}), 404

    try:
        pdf_file = io.BytesIO(form.file_data)
        reader = PdfReader(pdf_file)
        fields = reader.get_fields()
        
        if not fields:
            return jsonify({'form_id': id, 'form_name': form.form_name, 'fields': []}), 200

        # --- MODIFICATION ---
        # Extract both the name and the alternate name (tooltip)
        field_data = []
        for field_name, field_obj in fields.items():
            # '/TU' is the PDF key for the alternate (tooltip) text
            alternate_name = field_obj.get('/TU', None) 
            field_data.append({
                "name": field_name,
                "alternate_name": alternate_name
            })
        # --- END MODIFICATION ---

        return jsonify({'form_id': id, 'form_name': form.form_name, 'fields': field_data}), 200

    except Exception as e:
        print(f"Error reading PDF fields: {e}")
        return jsonify({'error': 'Failed to read PDF fields'}), 500


# --- API Endpoints for Mappings ---
# ... (get_mappings_for_form, create_or_update_mappings) ...
@app.route('/api/mappings/form/<int:form_id>', methods=['GET'])
def get_mappings_for_form(form_id):
    """Gets all saved field mappings for a specific form."""
    mappings = FieldMapping.query.filter_by(form_id=form_id).all()
    return jsonify([m.to_dict() for m in mappings]), 200

@app.route('/api/mappings', methods=['POST'])
def create_or_update_mappings():
    """Saves the field mappings for a form."""
    data = request.json
    if not data or 'form_id' not in data or 'mappings' not in data:
        return jsonify({'error': 'Invalid data. Required: form_id, mappings'}), 400
    form_id = data['form_id']
    new_mappings = data['mappings'] # This is a dict like {"pdf_field_1": "name", ...}
    FieldMapping.query.filter_by(form_id=form_id).delete()
    for pdf_field, entity_field in new_mappings.items():
        if entity_field:
            mapping = FieldMapping(
                form_id=form_id,
                pdf_field_name=pdf_field,
                entity_field_name=entity_field
            )
            db.session.add(mapping)
    db.session.commit()
    return jsonify({'message': 'Mappings saved successfully'}), 201


# --- NEW ENDPOINT FOR PDF GENERATION ---

@app.route('/api/generate-pdf', methods=['POST'])
def generate_pdf():
    """
    Generates a filled PDF for a specific entity and form.
    This is the "autopopulate" step.
    """
    data = request.json
    if not data or 'entity_id' not in data or 'form_id' not in data:
        return jsonify({'error': 'Invalid data. Required: entity_id, form_id'}), 400
        
    entity_id = data.get('entity_id')
    form_id = data.get('form_id')

    # 1. Get the Entity
    entity = db.session.get(Entity, entity_id)
    if not entity:
        return jsonify({'error': 'Entity not found'}), 404

    # 2. Get the PDF Form
    form = db.session.get(PdfForm, form_id)
    if not form:
        return jsonify({'error': 'Form not found'}), 404

    # 3. Get the Mappings
    mappings = FieldMapping.query.filter_by(form_id=form_id).all()
    if not mappings:
        return jsonify({'error': 'No mappings found for this form. Please configure them first.'}), 400

    try:
        # 4. Load the template PDF
        pdf_file_stream = io.BytesIO(form.file_data)
        reader = PdfReader(pdf_file_stream)
        writer = PdfWriter()

        # Copy all pages from reader to writer
        writer.append_pages_from_reader(reader)

        # 5. Loop through mappings and fill fields
        # This is where the "dynamic" part happens
        fill_data = {}
        for mapping in mappings:
            pdf_field = mapping.pdf_field_name
            entity_field = mapping.entity_field_name
            
            # Get the value from the entity object
            value = entity.get_field(entity_field)
            
            if value:
                fill_data[pdf_field] = str(value) # Ensure value is a string

        # Update the fields in the writer
        if fill_data:
            # update_page_form_field_values works on individual pages
            for page_num in range(len(writer.pages)):
                page = writer.pages[page_num]
                try:
                    writer.update_page_form_field_values(page, fill_data)
                except Exception as e:
                    print(f"Warning: Could not fill fields on page {page_num}: {e}")
                    
        # As per your plan, keep the PDF editable
        # We do this by *not* flattening the fields (writer.flatten_fields())

        # 6. Save the filled PDF to a new in-memory stream
        output_stream = io.BytesIO()
        writer.write(output_stream)
        output_stream.seek(0)
        
        writer.close()

        # 7. Send the new PDF to the user
        return send_file(
            output_stream,
            download_name=f"{entity.name}_{form.form_name}.pdf",
            mimetype='application/pdf',
            as_attachment=True
        )

    except Exception as e:
        print(f"Error generating PDF: {e}")
        return jsonify({'error': f'Failed to generate PDF: {str(e)}'}), 500


# --- Main Execution ---
if __name__ == '__main__':
    # This block will run when you start the app
    with app.app_context():
        # This line looks at your models and creates the tables
        db.create_all()
        print("Database tables created (if they didn't exist)!")
        
    app.run(debug=True, port=5001) # Running on port 5001
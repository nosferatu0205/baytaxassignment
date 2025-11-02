import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import io # Import io for in-memory file handling
from pypdf import PdfReader # Import PdfReader

app = Flask(__name__)
CORS(app) 

#... (Rest of your DB config and App init) ...
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_NAME = os.environ.get('DB_NAME', 'tax_filler_db')

app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Database Models (Schema) ---
#... (Entity Model) ...
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

#... (PdfForm Model) ...
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
    
    # Add a to_dict method for API responses
    def to_dict(self):
        """Serializes the object to a dictionary (without file_data)."""
        return {
            'id': self.id,
            'form_name': self.form_name,
            'uploaded_at': self.uploaded_at.isoformat()
        }

#... (FieldMapping Model) ...
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
    form = db.relationship('PdfForm', backref=db.backref('mappings', lazy=True))     

#... (Home route) ...
@app.route('/')
def home():
    return "Hello, Tax Filler Backend is running!"

# --- API Endpoints for Entities (CRUD) ---
#... (All Entity endpoints: POST, GET, PUT, DELETE) ...
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

#... (Upload endpoint) ...
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
        
        new_form = PdfForm(
            form_name=form_name,
            file_data=file_data
        )
        
        db.session.add(new_form)
        db.session.commit()
        
        return jsonify(new_form.to_dict()), 201
    else:
        return jsonify({'error': 'Invalid file type, only PDF allowed'}), 400

#... (Get All Forms endpoint) ...
@app.route('/api/forms', methods=['GET'])
def get_all_forms():
    """Gets all uploaded PDF forms (metadata only)."""
    forms = PdfForm.query.order_by(PdfForm.form_name).all()
    return jsonify([form.to_dict() for form in forms]), 200

# --- NEW ENDPOINT ---
@app.route('/api/forms/<int:id>/fields', methods=['GET'])
def get_form_fields(id):
    """
    Retrieves all fillable field names from a specific PDF form.
    """
    form = db.session.get(PdfForm, id)
    if not form:
        return jsonify({'error': 'Form not found'}), 404

    try:
        # Load the PDF data from the database into an in-memory stream
        pdf_file = io.BytesIO(form.file_data)
        
        # Read the PDF
        reader = PdfReader(pdf_file)
        
        # Get the fields
        fields = reader.get_fields()
        
        if not fields:
            return jsonify({'form_id': id, 'form_name': form.form_name, 'fields': []}), 200

        # Extract just the field names
        field_names = list(fields.keys())
        
        return jsonify({'form_id': id, 'form_name': form.form_name, 'fields': field_names}), 200

    except Exception as e:
        print(f"Error reading PDF fields: {e}")
        return jsonify({'error': 'Failed to read PDF fields'}), 500


# --- Main Execution ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Database tables created (if they didn't exist)!")
        
    app.run(debug=True, port=5001)
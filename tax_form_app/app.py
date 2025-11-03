import os
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import io
from pypdf import PdfReader, PdfWriter
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# PostgreSQL credentials
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_NAME = os.environ.get('DB_NAME', 'tax_filler_db')

# SQLAlchemy configuration
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
            'created_at': self.created_at.isoformat() if self.created_at else None
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
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
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

# Debug route
@app.route('/')
def home():
    return "Hello, Tax Filler Backend is running!"

# --- API Endpoints for Entities (CRUD) ---
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
        
        # Verify the PDF has form fields before accepting it
        try:
            pdf_file_stream = io.BytesIO(file_data)
            reader = PdfReader(pdf_file_stream)
            fields = reader.get_fields()
            
            if not fields:
                return jsonify({'error': 'The uploaded PDF does not contain any fillable form fields'}), 400
                
        except Exception as e:
            logger.error(f"Error checking PDF form fields: {e}")
            return jsonify({'error': 'Could not read PDF form fields'}), 400
        
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
def get_form_fields(id):
    """
    Retrieves all fillable field names and their properties from a specific PDF form.
    Enhanced to extract more field metadata and handle different field types.
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

        # Enhanced field extraction with type detection and additional properties
        field_data = []
        for field_name, field_obj in fields.items():
            # Get field properties
            field_type = field_obj.get('/FT', '/Tx')  # Default to text if type not specified
            field_type_str = str(field_type)  # Convert to string for easier comparison
            
            # Get tooltip (alternate name)
            alternate_name = field_obj.get('/TU', None)
            if alternate_name is not None:
                # If it's a PDF string object, get the text value
                if hasattr(alternate_name, 'get_text'):
                    alternate_name = alternate_name.get_text()
                else:
                    alternate_name = str(alternate_name)
            
            # Determine field type for better frontend display
            field_type_display = "text"  # Default
            if "/Btn" in field_type_str:
                field_type_display = "checkbox" if field_obj.get('/Ff', 0) & (1 << 15) else "button"
            elif "/Ch" in field_type_str:
                field_type_display = "dropdown" if field_obj.get('/Ff', 0) & (1 << 17) else "list"
            
            # Add field to the response
            field_data.append({
                "name": field_name,
                "alternate_name": alternate_name,
                "type": field_type_display,
                # Include parent name for nested fields if applicable
                "parent": field_name.split('.')[0] if '.' in field_name else None
            })
        
        # Sort fields to group related fields together
        field_data.sort(key=lambda x: x["name"])
        
        return jsonify({
            'form_id': id, 
            'form_name': form.form_name, 
            'fields': field_data
        }), 200

    except Exception as e:
        logger.error(f"Error reading PDF fields: {e}", exc_info=True)
        return jsonify({'error': f'Failed to read PDF fields: {str(e)}'}), 500

# --- API Endpoints for Mappings ---
@app.route('/api/mappings/form/<int:form_id>', methods=['GET'])
def get_mappings_for_form(form_id):
    """Gets all saved field mappings for a specific form."""
    # First verify the form exists
    form = db.session.get(PdfForm, form_id)
    if not form:
        return jsonify({'error': 'Form not found'}), 404
        
    mappings = FieldMapping.query.filter_by(form_id=form_id).all()
    return jsonify([m.to_dict() for m in mappings]), 200

@app.route('/api/mappings', methods=['POST'])
def create_or_update_mappings():
    """
    Saves the field mappings for a form.
    Enhanced to validate mappings and provide better error handling.
    """
    data = request.json
    if not data or 'form_id' not in data or 'mappings' not in data:
        return jsonify({'error': 'Invalid data. Required: form_id, mappings'}), 400
    
    form_id = data['form_id']
    new_mappings = data['mappings'] # This is a dict like {"pdf_field_1": "name", ...}
    
    # Verify the form exists
    form = db.session.get(PdfForm, form_id)
    if not form:
        return jsonify({'error': 'Form not found'}), 404
    
    # Verify all entity fields being mapped are valid
    entity_fields = ['name', 'street_address', 'city', 'state', 'zip_code']
    
    for pdf_field, entity_field in new_mappings.items():
        if entity_field and entity_field not in entity_fields:
            return jsonify({
                'error': f"Invalid entity field '{entity_field}'. Valid fields are: {', '.join(entity_fields)}"
            }), 400
    
    try:
        # Delete existing mappings for this form
        FieldMapping.query.filter_by(form_id=form_id).delete()
        
        # Create new mappings
        for pdf_field, entity_field in new_mappings.items():
            if entity_field:  # Only create mapping if entity field is specified
                mapping = FieldMapping(
                    form_id=form_id,
                    pdf_field_name=pdf_field,
                    entity_field_name=entity_field
                )
                db.session.add(mapping)
                
        db.session.commit()
        return jsonify({'message': 'Mappings saved successfully'}), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving mappings: {e}", exc_info=True)
        return jsonify({'error': f'Failed to save mappings: {str(e)}'}), 500

# --- Enhanced PDF Generation Endpoint ---
# --- Enhanced PDF Generation Endpoint ---
@app.route('/api/generate-pdf', methods=['POST'])
def generate_pdf():
    """
    Generates a filled PDF for a specific entity and form.
    Enhanced with better error handling, logging, and field population.
    """
    data = request.json
    if not data or 'entity_id' not in data or 'form_id' not in data:
        return jsonify({'error': 'Invalid data. Required: entity_id, form_id'}), 400
        
    entity_id = data.get('entity_id')
    form_id = data.get('form_id')

    # Get the Entity
    entity = db.session.get(Entity, entity_id)
    if not entity:
        return jsonify({'error': 'Entity not found'}), 404

    # Get the PDF Form
    form = db.session.get(PdfForm, form_id)
    if not form:
        return jsonify({'error': 'Form not found'}), 404

    # Get the Mappings
    mappings = FieldMapping.query.filter_by(form_id=form_id).all()
    if not mappings:
        return jsonify({'error': 'No mappings found for this form. Please configure field mappings first.'}), 400

    try:
        # Load the template PDF
        pdf_file_stream = io.BytesIO(form.file_data)
        reader = PdfReader(pdf_file_stream)
        
        # Verify the PDF has form fields
        fields = reader.get_fields()
        if not fields:
            return jsonify({'error': 'The PDF does not contain any fillable form fields'}), 400
        
        # --- START OF FIX ---
        
        writer = PdfWriter()
        
        # Clone the entire document from the reader, including form fields
        writer.clone_document_from_reader(reader)
        writer.set_need_appearances_writer(True)
        # The manual page-copying loop below is no longer needed and should be removed.
        # for page in reader.pages:
        #     writer.add_page(page)

        # --- END OF FIX ---
        
        # Prepare the field data dictionary
        fill_data = {}
        
        # Track field mappings for logging
        mapped_fields = []
        
        # Loop through mappings and build the fill data dictionary
        for mapping in mappings:
            pdf_field = mapping.pdf_field_name
            entity_field = mapping.entity_field_name
            
            # Get the value from the entity object
            value = entity.get_field(entity_field)
            
            if value is not None:
                # Convert value to string
                string_value = str(value)
                
                # Add to fill data
                fill_data[pdf_field] = string_value
                mapped_fields.append(f"{pdf_field} -> {entity_field} = '{string_value}'")
            else:
                logger.warning(f"No value found for entity field '{entity_field}' (mapped to PDF field '{pdf_field}')")
        
        # Log the mappings that will be applied
        logger.info(f"Applying {len(mapped_fields)} mappings to PDF: {mapped_fields}")
        
        # Apply the field values - PyPDF library will handle this
        if fill_data:
            # The writer now has the AcroForm, so this will work
            writer.update_page_form_field_values(writer.pages[0], fill_data)
            
            # For multi-page forms, try to apply to all pages
            for i in range(1, len(writer.pages)):
                try:
                    writer.update_page_form_field_values(writer.pages[i], fill_data)
                except Exception as page_error:
                    logger.warning(f"Could not fill fields on page {i+1}: {page_error}")
        
        # Save the filled PDF to a new in-memory stream
        output_stream = io.BytesIO()
        writer.write(output_stream)
        output_stream.seek(0)
        
        # Create a meaningful filename
        filename = f"{entity.name.replace(' ', '_')}_{form.form_name.replace(' ', '_')}.pdf"
        
        # Send the PDF as a response
        return send_file(
            output_stream,
            download_name=filename,
            mimetype='application/pdf',
            as_attachment=True
        )

    except Exception as e:
        logger.error(f"Error generating PDF: {e}", exc_info=True)
        return jsonify({'error': f'Failed to generate PDF: {str(e)}'}), 500
    
# --- Debugging endpoints for troubleshooting ---
@app.route('/api/debug/form/<int:id>', methods=['GET'])
def debug_form_fields(id):
    """
    Debug endpoint to get detailed information about a form's fields.
    For development/troubleshooting use.
    """
    form = db.session.get(PdfForm, id)
    if not form:
        return jsonify({'error': 'Form not found'}), 404

    try:
        pdf_file = io.BytesIO(form.file_data)
        reader = PdfReader(pdf_file)
        
        # Get all form fields
        fields = reader.get_fields()
        
        # Prepare detailed field info
        field_details = {}
        for field_name, field_obj in fields.items():
            # Extract all field properties
            properties = {}
            for key, value in field_obj.items():
                if hasattr(value, 'get_text'):
                    properties[str(key)] = value.get_text()
                else:
                    properties[str(key)] = str(value)
                    
            field_details[field_name] = properties
        
        # Return detailed field information
        return jsonify({
            'form_id': id,
            'form_name': form.form_name,
            'page_count': len(reader.pages),
            'field_count': len(fields),
            'fields': field_details
        }), 200
        
    except Exception as e:
        logger.error(f"Debug error: {e}", exc_info=True)
        return jsonify({'error': f'Debug error: {str(e)}'}), 500

@app.route('/api/debug/test-mapping', methods=['POST'])
def debug_test_mapping():
    """
    Debug endpoint to test field mappings without generating a PDF.
    For development/troubleshooting use.
    """
    data = request.json
    if not data or 'entity_id' not in data or 'form_id' not in data:
        return jsonify({'error': 'Invalid data. Required: entity_id, form_id'}), 400
        
    entity_id = data.get('entity_id')
    form_id = data.get('form_id')

    # Get the Entity
    entity = db.session.get(Entity, entity_id)
    if not entity:
        return jsonify({'error': 'Entity not found'}), 404
        
    # Get the PDF Form
    form = db.session.get(PdfForm, form_id)
    if not form:
        return jsonify({'error': 'Form not found'}), 404
        
    # Get the Mappings
    mappings = FieldMapping.query.filter_by(form_id=form_id).all()
    
    # Prepare mapping test results
    mapping_results = []
    
    for mapping in mappings:
        pdf_field = mapping.pdf_field_name
        entity_field = mapping.entity_field_name
        value = entity.get_field(entity_field)
        
        mapping_results.append({
            'pdf_field': pdf_field,
            'entity_field': entity_field,
            'entity_value': str(value) if value is not None else None
        })
    
    return jsonify({
        'entity': entity.to_dict(),
        'form': form.to_dict(),
        'mappings': mapping_results,
        'mapping_count': len(mappings)
    }), 200

# --- Main Execution ---
if __name__ == '__main__':
    # This block will run when you start the app
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        logger.info("Database tables created (if they didn't exist)!")
        
    # Run the Flask app
    app.run(debug=True, port=5001)
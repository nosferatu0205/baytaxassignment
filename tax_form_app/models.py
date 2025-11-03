from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

# Initialize the SQLAlchemy extension, but don't bind it to an app yet.
# This allows us to use it in our factory.
db = SQLAlchemy()

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
import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS

# Import the db instance from .models
from .models import db

def create_app():
    """
    Application Factory: Creates and configures the Flask app.
    """
    
    # Set up logging
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger(__name__)
    logger.info("Starting to create Flask app...")

    app = Flask(__name__)
    CORS(app) # Enable CORS for the entire app

    # --- Database Configuration ---
    # PostgreSQL credentials
    DB_USER = os.environ.get('DB_USER', 'postgres')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '5432')
    DB_NAME = os.environ.get('DB_NAME', 'tax_filler_db')

    # SQLAlchemy configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # --- Initialize Extensions ---
    # Bind the db instance to the app
    db.init_app(app)

    # --- Register Blueprints (Routes) ---
    # Import and register the API routes from routes.py
    from . import routes
    app.register_blueprint(routes.api)

    # --- Root/Health Check Route ---
    @app.route('/')
    def home():
        return "Hello, Tax Filler Backend is running!"
        
    logger.info("Flask app created successfully.")
    return app
import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS

#db imported from models
from .models import db

def create_app():
    """
    Application Factory: Creates and configures the Flask app.
    """
    
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger(__name__)
    logger.info("Starting to create Flask app...")

    app = Flask(__name__)
    CORS(app) #CORS issue? need to debug

     # PostgreSQL credentials// not sure why postgresql profile variants are misbehaving..
    DB_USER = os.environ.get('DB_USER', 'postgres')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '5432')
    DB_NAME = os.environ.get('DB_NAME', 'tax_filler_db')

    # ?? sqlalchemy documentat
    app.config['SQLALCHEMY_DATABASE_URI'] = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    from . import routes
    app.register_blueprint(routes.api)

    # --- Root/Health Check Route ---
    @app.route('/')
    def home():
        return "Hello, Tax Filler Backend is running!"
        
    logger.info("Flask app created successfully.")
    return app
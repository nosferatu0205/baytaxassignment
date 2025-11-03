import logging
from . import create_app
from .models import db

# Get the logger
logger = logging.getLogger(__name__)

#app factory implemented
app = create_app()

# -main-
if __name__ == '__main__':
    # core loop
    with app.app_context():
        # Create tables if they don't exist
        logger.info("Creating database tables (if they don't exist)...")
        db.create_all()
        logger.info("Database tables checked/created.")
        
    # Run the Flask app
    logger.info("Starting Flask app on port 5001...")
    app.run(debug=True, port=5001)
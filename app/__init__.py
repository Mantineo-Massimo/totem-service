import os
from flask import Flask

def create_app():
    """
    EN: Creates and configures the Flask application for the Totem Service.
    IT: Crea e configura l'applicazione Flask per il Totem Service.
    """
    app = Flask(__name__)
    
    # EN: Register the blueprint containing all routes.
    # IT: Registra il blueprint contenente tutte le rotte.
    from app.api.routes import bp as totem_bp
    app.register_blueprint(totem_bp, url_prefix='/totem')
    
    return app

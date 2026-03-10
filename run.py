"""
EN: WSGI entry point for the Totem Service.
IT: Punto di ingresso WSGI per il Totem Service.
"""
from app import create_app

application = create_app()

if __name__ == '__main__':
    application.run(host='0.0.0.0', port=8080, debug=True)
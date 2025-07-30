import os
import json
from flask import Flask, send_from_directory, jsonify, abort

app = Flask(
    __name__,
    static_folder='ui',
    template_folder='ui'
)

# --- API Endpoint per i Dati del Totem ---
@app.route('/api/location/<string:location_id>')
def get_location_data(location_id):
    filename = f"{location_id}.json"
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    file_path = os.path.join(data_dir, filename)
    if not os.path.exists(file_path):
        abort(404)
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return jsonify(data)

# --- Rotte per Servire i File dell'Interfaccia Utente ---

@app.route('/')
def index():
    """Serve la pagina principale del totem (index.html)."""
    return send_from_directory(app.template_folder, 'index.html')

# Rotte esplicite per i file statici, che è più robusto
@app.route('/static/<path:path>')
def serve_static_files(path):
    """Serve i file dalla cartella ui/static/ (CSS, JS)."""
    return send_from_directory(os.path.join(app.static_folder, 'static'), path)

@app.route('/assets/<path:path>')
def serve_assets(path):
    """Serve i file dalla cartella ui/assets/ (immagini, etc.)."""
    return send_from_directory(os.path.join(app.static_folder, 'assets'), path)

@app.route('/favicon.ico')
def favicon():
    """Serve il favicon dalla cartella ui/."""
    # Assumendo che il favicon sia in ui/assets/
    return send_from_directory(os.path.join(app.static_folder, 'assets'), 'favicon.ico')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
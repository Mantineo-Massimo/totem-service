import os
import json
from flask import Flask, send_from_directory, jsonify, abort

app = Flask(__name__, static_folder='ui')

# --- API Endpoint ---
@app.route('/api/location/<string:location_id>')
def get_location_data(location_id):
    """
    Carica e restituisce i dati di configurazione per un totem specifico.
    """
    # Costruisce il percorso al file JSON in modo sicuro
    filename = f"{location_id}.json"
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    file_path = os.path.join(data_dir, filename)

    if not os.path.exists(file_path):
        abort(404, description=f"Configurazione per '{location_id}' non trovata.")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        abort(500, description=f"Errore nel leggere il file di configurazione: {e}")


# --- Rotte per servire la pagina e le risorse ---
@app.route('/')
def index():
    """Serve la pagina principale del totem."""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:filename>')
def serve_content(filename):
    """Serve i file statici (CSS, JS, assets)."""
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
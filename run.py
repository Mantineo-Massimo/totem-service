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

@app.route("/<string:building>/<string:floor_str>/<string:image_name>")
def floor_display(building: str, floor_str: str, image_name: str):
    building_key = building.upper()
    try:
        floor_number = int(re.sub(r'\D', '', floor_str) or 0)
    except (ValueError, TypeError):
        abort(400)

    if (building_key not in BUILDING_PATHS or
            floor_number not in ALLOWED_FLOORS or
            image_name not in IMAGE_EXTENSIONS):
        abort(404)

    building_folder = BUILDING_PATHS[building_key]
    image_extension = IMAGE_EXTENSIONS[image_name]
    full_filename = f"{image_name}{image_extension}"
    
    # Il percorso ora punta a un'immagine da inserire nella pagina
    image_path_for_template = f"/floorplan/assets/{building_folder}/{floor_str}/{full_filename}"
    
    full_disk_path = os.path.join(app.static_folder, 'assets', building_folder, floor_str, full_filename)
    if not os.path.exists(full_disk_path):
        abort(404)

    return render_template(
        "index.html",
        floorplan_image_url=image_path_for_template,
        building_name=building_key,
        floor_number=floor_number
    )
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
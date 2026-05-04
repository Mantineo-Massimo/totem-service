import os
from flask import Blueprint, jsonify, request, send_from_directory, current_app
import requests
from bs4 import BeautifulSoup

from app.services.scraper import scrape_unime_page
from app.services.pathfinder import dijkstra

try:
    from app.data.graph_data import NODES, EDGES, MAPS, LOCATIONS
except ImportError as e:
    print(f"ERRORE: Impossibile trovare graph_data: {e}")
    NODES, EDGES, MAPS, LOCATIONS = {}, [], {}, {}

bp = Blueprint('totem', __name__, template_folder=os.path.join('..', 'ui', 'pages'))

# --- Preparazione del Grafo ---
from collections import defaultdict
GRAPH = defaultdict(list)
for start, end, weight in EDGES:
    GRAPH[start].append((end, weight))
    GRAPH[end].append((start, weight))

# ==============================================================================
# --- API Endpoints ---
# ==============================================================================

@bp.route('/api/locations')
def get_locations():
    return jsonify(LOCATIONS)

@bp.route('/api/scrape/events')
def scrape_events():
    event_selectors = {
        'list': 'div.card-row',
        'title': 'div.anteprima-card__title',
        'link': 'a.card__link--hidden',
        'date': 'div.anteprima-card__data:last-child'
    }
    events = scrape_unime_page('https://www.unime.it/eventi', event_selectors)
    
    if events is None:
        return jsonify({"error": "Impossibile contattare il server Unime per gli eventi."}), 502
    
    valid_events = [e for e in events if e.get('date') and e.get('date').strip()]
    return jsonify(valid_events)

@bp.route('/api/scrape/news')
def scrape_news():
    news_selectors = {
        'list': 'div.card-row',
        'title': 'div.anteprima-card__title',
        'link': 'a.card__link--hidden',
        'date': 'div.anteprima-card__data'
    }
    news = scrape_unime_page('https://www.unime.it/notizie', news_selectors)

    if news is None:
        return jsonify({"error": "Impossibile contattare il server Unime per le notizie."}), 502

    valid_news = [n for n in news if n.get('date') and n.get('date').strip()]
    return jsonify(valid_news)

@bp.route('/api/scrape/detail')
def scrape_detail():
    url_to_scrape = request.args.get('url')
    if not url_to_scrape or not url_to_scrape.startswith('https://www.unime.it'):
        return jsonify({"error": "URL mancante o non valido"}), 400

    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
        page = requests.get(url_to_scrape, headers=headers, timeout=10)
        page.raise_for_status()
        soup = BeautifulSoup(page.content, 'html.parser')

        title_element = soup.select_one('h2.title-page__title') 
        body_element = soup.select_one('div.field--name-field-testo-paragrafo')
        if not body_element:
            body_element = soup.select_one('main#content div.content')

        if body_element:
            for a_tag in body_element.find_all('a', href=True):
                a_tag.unwrap()

            for img_tag in body_element.find_all('img', src=True):
                if img_tag['src'].startswith('/'):
                    img_tag['src'] = f"https://www.unime.it{img_tag['src']}"
            
            body_html = str(body_element)
        else:
            body_html = '<p>Impossibile caricare il contenuto.</p>'
        
        title = title_element.text.strip() if title_element else 'Titolo non disponibile'

        return jsonify({'title': title, 'body_html': body_html})

    except requests.RequestException as e:
        print(f"Errore durante lo scraping della pagina di dettaglio {url_to_scrape}: {e}")
        return jsonify({"error": f"Impossibile contattare il server Unime: {e}"}), 502

@bp.route('/api/find')
def find_path():
    start_node_query = request.args.get('start_node')
    destination_node = request.args.get('destination_id')

    if not start_node_query or not destination_node:
        return jsonify({"error": "Parametri mancanti."}), 400

    start_node_map = {'totem_A': 'totem_A_ingresso', 'totem_B': 'totem_B_ingresso', 'totem_SBA': 'totem_SBA_ingresso'}
    start_node = start_node_map.get(start_node_query)

    if not start_node or start_node not in NODES:
        return jsonify({"error": "Punto di partenza non valido."}), 404
    if destination_node not in NODES:
        return jsonify({"error": f"Destinazione '{destination_node}' non trovata nel grafo."}), 404

    path_nodes = dijkstra(GRAPH, start_node, destination_node, NODES)

    if not path_nodes:
        return jsonify({"error": "Impossibile calcolare un percorso."}), 404

    destination_data = NODES[destination_node]
    map_id = destination_data['map_id']
    map_info = MAPS[map_id]

    response_data = {
        "floorplan_url": map_info['floorplan_url'],
        "image_dimensions": map_info['dimensions'],
        "path": [NODES[node_id]['coords'] for node_id in path_nodes]
    }
    return jsonify(response_data)

# --- Frontend Routes ---
@bp.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(os.path.join(current_app.root_path, '..', 'ui', 'static'), filename)

@bp.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(current_app.root_path, '..', 'ui', 'assets'), filename)

@bp.route('/')
def index():
    return send_from_directory(bp.template_folder, 'home.html')

@bp.route('/<string:page_name>.html')
def serve_page(page_name):
    return send_from_directory(bp.template_folder, f'{page_name}.html')

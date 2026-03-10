import os
import heapq
from collections import defaultdict
from flask import Flask, Blueprint, jsonify, send_from_directory, abort, request

# Importa le librerie per lo scraping
import requests
from bs4 import BeautifulSoup

# Importa i dati della mappa dal nostro file di configurazione
try:
    from graph_data import NODES, EDGES, MAPS, LOCATIONS
except ImportError:
    print("ERRORE: Impossibile trovare graph_data.py. Assicurati che il file esista.")
    # Definizioni di fallback per evitare crash all'avvio
    NODES, EDGES, MAPS, LOCATIONS = {}, [], {}, {}


app = Flask(__name__, static_folder='ui/static', static_url_path='/totem/static')
totem_bp = Blueprint('totem', __name__, template_folder=os.path.join('ui', 'pages'))

# --- Preparazione del Grafo ---
GRAPH = defaultdict(list)
for start, end, weight in EDGES:
    GRAPH[start].append((end, weight))
    GRAPH[end].append((start, weight))

# --- Algoritmo di Dijkstra (invariato) ---
def dijkstra(graph, start_node, end_node):
    distances = {node: float('infinity') for node in NODES}
    distances[start_node] = 0
    previous_nodes = {node: None for node in NODES}
    priority_queue = [(0, start_node)]
    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)
        if current_distance > distances[current_node]: continue
        if current_node == end_node: break
        for neighbor, weight in graph.get(current_node, []):
            distance = current_distance + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous_nodes[neighbor] = current_node
                heapq.heappush(priority_queue, (distance, neighbor))
    path = []
    current = end_node
    while current is not None:
        path.append(current)
        current = previous_nodes.get(current)
    path.reverse()
    if path and path[0] == start_node: return path
    return None

# --- Funzione Helper per lo Scraping ---
def scrape_unime_page(url, selector_map):
    """
    Funzione helper generica per lo scraping.
    """
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
        page = requests.get(url, headers=headers, timeout=10)
        page.raise_for_status() # Controlla se ci sono errori HTTP
        soup = BeautifulSoup(page.content, 'html.parser')
        
        items = []
        if not soup.select(selector_map['list']):
            print(f"ATTENZIONE SCRAPING: Il selettore lista '{selector_map['list']}' non ha trovato nulla su {url}")
            
        for item in soup.select(selector_map['list']):
            title_element = item.select_one(selector_map['title'])
            link_element = item.select_one(selector_map['link'])
            date_element = item.select_one(selector_map.get('date')) # .get() per selettori opzionali

            link = link_element['href'] if link_element and link_element.has_attr('href') else None
            if link and link.startswith('/'):
                link = f"https://www.unime.it{link}" # Rende il link assoluto

            items.append({
                'title': title_element.text.strip() if title_element else 'Titolo non trovato',
                'link': link,
                'date': date_element.text.strip() if date_element else None
            })
        return items
    except requests.RequestException as e:
        print(f"Errore grave durante lo scraping di {url}: {e}")
        return None # Restituisce None per segnalare l'errore al chiamante

# ==============================================================================
# --- API Endpoints ---
# ==============================================================================

# Endpoint: Fornisce al frontend la lista di tutti gli edifici e aule
@totem_bp.route('/api/locations')
def get_locations():
    return jsonify(LOCATIONS)

# Endpoint: API per gli eventi
@totem_bp.route('/api/scrape/events')
def scrape_events():
    """
    API per gli eventi.
    SELETTORI AGGIORNATI (13/11/2025).
    Usiamo :last-child per la data per ignorare i div vuoti.
    """
    event_selectors = {
        'list': 'div.card-row',                     # Contenitore per ogni "card"
        'title': 'div.anteprima-card__title',     # Il selettore per il titolo
        'link': 'a.card__link--hidden',           # Il selettore per il link (prendiamo l'href)
        'date': 'div.anteprima-card__data:last-child' # Prende l'ULTIMO div data
    }
    events = scrape_unime_page('https://www.unime.it/eventi', event_selectors)
    
    if events is None:
        return jsonify({"error": "Impossibile contattare il server Unime per gli eventi."}), 502
    
    # Filtriamo per assicurarci che ci sia una data (necessario per infopoint.js)
    valid_events = [e for e in events if e.get('date') and e.get('date').strip()]
    return jsonify(valid_events)

# Endpoint: API per le notizie
@totem_bp.route('/api/scrape/news')
def scrape_news():
    """
    API per le notizie.
    SELETTORI AGGIORNATI (13/11/2025).
    """
    news_selectors = {
        'list': 'div.card-row',                     # Contenitore per ogni "card"
        'title': 'div.anteprima-card__title',     # Il selettore per il titolo
        'link': 'a.card__link--hidden',           # Il selettore per il link (prendiamo l'href)
        'date': 'div.anteprima-card__data'        # Il selettore per la data
    }
    news = scrape_unime_page('https://www.unime.it/notizie', news_selectors)

    if news is None:
        return jsonify({"error": "Impossibile contattare il server Unime per le notizie."}), 502

    # Filtriamo anche qui per sicurezza
    valid_news = [n for n in news if n.get('date') and n.get('date').strip()]
    return jsonify(valid_news)

# --- API PER I DETTAGLI (per la modale) - LINK DISATTIVATI ---
@totem_bp.route('/api/scrape/detail')
def scrape_detail():
    """
    API per recuperare il contenuto di una singola pagina di evento/news
    per visualizzarlo nella finestra modale.
    
    AGGIORNAMENTO: Tutti i link <a> vengono rimossi (unwrapped), 
    lasciando solo il testo.
    """
    url_to_scrape = request.args.get('url')
    if not url_to_scrape or not url_to_scrape.startswith('https://www.unime.it'):
        return jsonify({"error": "URL mancante o non valido"}), 400

    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
        page = requests.get(url_to_scrape, headers=headers, timeout=10)
        page.raise_for_status()
        soup = BeautifulSoup(page.content, 'html.parser')

        # --- SELETTORI CORRETTI ---
        # 1. Trova il titolo
        title_element = soup.select_one('h2.title-page__title') 

        # 2. Trova il corpo del testo
        body_element = soup.select_one('div.field--name-field-testo-paragrafo')
        if not body_element:
            body_element = soup.select_one('main#content div.content')

        # --- MODIFICA CHIAVE: Disattivazione Link ---
        if body_element:
            # Trova tutti i tag <a> che hanno un attributo href
            for a_tag in body_element.find_all('a', href=True):
                # .unwrap() rimuove il tag <a>, lasciando solo il suo 
                # contenuto (es. il testo "Visualizza locandina")
                a_tag.unwrap()

            # Manteniamo la correzione per le immagini
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
# --- FINE API DETTAGLI ---

# Endpoint: Calcola il percorso
@totem_bp.route('/api/find')
def find_path():
    start_node_query = request.args.get('start_node') # es. "totem_A"
    destination_node = request.args.get('destination_id') # es. "A-1-1"

    if not start_node_query or not destination_node:
        return jsonify({"error": "Parametri mancanti."}), 400

    start_node_map = {'totem_A': 'totem_A_ingresso', 'totem_B': 'totem_B_ingresso', 'totem_SBA': 'totem_SBA_ingresso'}
    start_node = start_node_map.get(start_node_query)

    if not start_node or start_node not in NODES:
        return jsonify({"error": "Punto di partenza non valido."}), 404
    if destination_node not in NODES:
        return jsonify({"error": f"Destinazione '{destination_node}' non trovata nel grafo. Aggiorna NODES in graph_data.py"}), 404

    path_nodes = dijkstra(GRAPH, start_node, destination_node)

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


# --- Frontend Routes (per servire HTML e assets) ---
@totem_bp.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(os.path.dirname(__file__), 'ui', 'assets'), filename)

@totem_bp.route('/')
def index():
    return send_from_directory(totem_bp.template_folder, 'home.html')

@totem_bp.route('/<string:page_name>.html')
def serve_page(page_name):
    # Prova a inviare il file. Se non esiste, Flask gestirà l'errore 404.
    return send_from_directory(totem_bp.template_folder, f'{page_name}.html')

# --- Registrazione Blueprint ---
# Questo registra tutte le rotte qui sopra con il prefisso /totem
app.register_blueprint(totem_bp, url_prefix='/totem')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
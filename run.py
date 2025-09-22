import os
import json
from urllib.parse import urljoin
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from flask import Flask, Blueprint, jsonify, send_from_directory, abort, request, Response

# Configurazione Flask
app = Flask(__name__, static_folder='ui/static', static_url_path='/totem/static')

# Blueprint
totem_bp = Blueprint(
    'totem',
    __name__,
    template_folder=os.path.join('ui', 'pages')
)

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

def make_absolute_url(base, path):
    return urljoin(base, path)

# --- API Routes ---
@totem_bp.route('/api/time')
def get_server_time():
    return jsonify({'server_time': datetime.now().isoformat()})

def scrape_list_page(list_url, item_selector, item_parser):
    try:
        base_url = 'https://www.unime.it'
        response = requests.get(list_url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        items_list = []
        for item_card in soup.select(item_selector):
            link_element = item_card.select_one('a.card__link--hidden')
            if link_element:
                detail_link = make_absolute_url(base_url, link_element['href'])
                item_data = item_parser(item_card, base_url, detail_link)
                if item_data:
                    items_list.append(item_data)
        return jsonify(items_list)
    except Exception as e:
        print(f"Errore durante lo scraping di {list_url}: {e}")
        return jsonify({"error": str(e)}), 500

def parse_event_list_item(item_card, base_url, detail_link):
    title_element = item_card.select_one('div.anteprima-card__title')
    date_element = item_card.select_one('div.anteprima-card__data:last-of-type')
    if title_element and date_element:
        return {'title': title_element.get_text(strip=True), 'link': detail_link, 'date': date_element.get_text(strip=True)}
    return None

def parse_news_list_item(item_card, base_url, detail_link):
    title_element = item_card.select_one('div.anteprima-card__title')
    if title_element:
        return {'title': title_element.get_text(strip=True), 'link': detail_link}
    return None

@totem_bp.route('/api/scrape/events')
def scrape_events():
    return scrape_list_page('https://www.unime.it/eventi', 'div.col-12.col-md-6.col-lg-4.card-row', parse_event_list_item)

@totem_bp.route('/api/scrape/news')
def scrape_news():
    return scrape_list_page('https://www.unime.it/notizie', 'div.col-12.col-md-6.col-lg-4.card-row', parse_news_list_item)

@totem_bp.route('/api/scrape/detail')
def scrape_detail():
    url_to_fetch = request.args.get('url')
    if not url_to_fetch:
        return jsonify({"error": "URL non specificato"}), 400

    try:
        base_url = 'https://www.unime.it'
        response = requests.get(url_to_fetch, headers=HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        title_element = soup.select_one('h1.page-title')
        
        # --- MODIFICA ---
        # Se non troviamo un titolo specifico, impostiamo il titolo a None (nessun valore)
        # invece che alla stringa "Dettagli".
        if title_element:
            title = title_element.get_text(strip=True)
        else:
            title = None 

        content_block = soup.select_one('div.field--name-field-testo-paragrafo')

        if content_block:
            for a_tag in content_block.find_all('a'):
                a_tag.unwrap()
            for tag in content_block.find_all('img'):
                if tag.has_attr('src'):
                    tag['src'] = make_absolute_url(base_url, tag.get('src'))
            body_html = str(content_block)
        else:
            body_html = '<p>Contenuto non disponibile o impossibile da recuperare.</p>'

        return jsonify({'title': title, 'body_html': body_html})

    except Exception as e:
        print(f"Errore generico nello scraping dei dettagli da {url_to_fetch}: {e}")
        return jsonify({"error": "Si è verificato un errore interno durante l'elaborazione della pagina."}), 500

# ... (il resto del file python rimane invariato) ...

@totem_bp.route('/assets/<path:filename>')
def serve_assets(filename):
    assets_dir = os.path.join(os.path.dirname(__file__), 'ui', 'assets')
    return send_from_directory(assets_dir, filename)

@totem_bp.route('/')
def index():
    return send_from_directory(totem_bp.template_folder, 'home.html')

@totem_bp.route('/<string:page_name>.html')
def serve_page(page_name):
    return send_from_directory(totem_bp.template_folder, f'{page_name}.html')

app.register_blueprint(totem_bp, url_prefix='/totem')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
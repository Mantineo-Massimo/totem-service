# DigitalSignageSuite/totem-service/run.py

import os
import json
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from flask import Flask, Blueprint, jsonify, send_from_directory, abort

# Configurazione dell'applicazione Flask
app = Flask(__name__, static_folder='ui/static', static_url_path='/totem/static')

# Definizione del Blueprint
totem_bp = Blueprint(
    'totem',
    __name__,
    template_folder=os.path.join('ui', 'pages')
)

# Intestazione per simulare un browser reale durante lo scraping
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def make_absolute_url(base, path):
    """Costruisce un URL assoluto da un URL base e un percorso relativo."""
    return urljoin(base, path)

# --- API per Wayfinding (Trova Aula) ---
@totem_bp.route('/api/wayfinding/data')
def get_wayfinding_data():
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    wayfinding_data = {"floors": [], "totems": {}}
    totems_path = os.path.join(data_dir, 'totems.json')
    if os.path.exists(totems_path):
        with open(totems_path, 'r', encoding='utf-8') as f:
            wayfinding_data['totems'] = json.load(f)
    for filename in os.listdir(data_dir):
        if filename.startswith('piano_') and filename.endswith('.json'):
            file_path = os.path.join(data_dir, filename)
            with open(file_path, 'r', encoding='utf-8') as f:
                wayfinding_data['floors'].append(json.load(f))
    return jsonify(wayfinding_data)

# --- API per Scraping (News & Eventi) ---
def get_details_from_page(detail_url, base_url):
    details = {'body_html': '<p>Contenuto non disponibile.</p>'}
    try:
        response = requests.get(detail_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        content_block = soup.select_one('div.field--name-field-testo-paragrafo')
        if content_block:
            for tag in content_block.find_all(['a', 'img']):
                if tag.has_attr('href'): tag['href'] = make_absolute_url(base_url, tag['href'])
                if tag.has_attr('src'): tag['src'] = make_absolute_url(base_url, tag['src'])
            details['body_html'] = str(content_block)
    except requests.exceptions.RequestException as e: print(f"Errore dettagli da {detail_url}: {e}")
    return details

def scrape_list_page(list_url, item_parser):
    try:
        base_url = 'https://www.unime.it'
        response = requests.get(list_url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        items_list = []
        # Il selettore CSS è applicato qui direttamente
        for item_card in soup.select('div.col-12.col-md-6.col-lg-4.card-row'):
            link_element = item_card.select_one('a.card__link--hidden')
            if link_element:
                detail_link = make_absolute_url(base_url, link_element['href'])
                item_data = item_parser(item_card, base_url, detail_link)
                if item_data:
                    details = get_details_from_page(detail_link, base_url)
                    item_data.update(details)
                    items_list.append(item_data)
        return jsonify(items_list[:6])
    except Exception as e: return jsonify({"error": str(e)}), 500

def parse_event_list_item(item_card, base_url, detail_link):
    title_element = item_card.select_one('div.anteprima-card__title')
    date_element = item_card.select_one('div.anteprima-card__data:last-of-type')
    if title_element and date_element: return {'title': title_element.get_text(strip=True), 'link': detail_link, 'date': date_element.get_text(strip=True)}
    return None

def parse_news_list_item(item_card, base_url, detail_link):
    title_element = item_card.select_one('div.anteprima-card__title')
    if title_element: return {'title': title_element.get_text(strip=True), 'link': detail_link}
    return None

# CORREZIONE: Rimosso l'argomento in più nelle chiamate a scrape_list_page
@totem_bp.route('/api/scrape/events')
def scrape_events(): return scrape_list_page('https://www.unime.it/eventi', parse_event_list_item)
@totem_bp.route('/api/scrape/news')
def scrape_news(): return scrape_list_page('https://www.unime.it/notizie', parse_news_list_item)

# --- Route per il frontend ---

# NUOVA ROUTE: Aggiunta per servire le immagini di sfondo
@totem_bp.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join('ui', 'assets'), filename)

@totem_bp.route('/')
def index():
    return send_from_directory(totem_bp.template_folder, 'home.html')

@totem_bp.route('/<string:page_name>.html')
def serve_page(page_name):
    page_path = os.path.join(totem_bp.template_folder, f'{page_name}.html')
    if not os.path.exists(page_path):
        abort(404)
    return send_from_directory(totem_bp.template_folder, f'{page_name}.html')

app.register_blueprint(totem_bp, url_prefix='/totem')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
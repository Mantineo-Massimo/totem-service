import requests
from bs4 import BeautifulSoup

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

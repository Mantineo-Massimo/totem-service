# /totem-service/graph_data.py (VERSIONE COMPLETATA CON TUTTE LE AULE)

# ==============================================================================
# 1. ELENCO STRUTTURATO DI EDIFICI, PIANI E AULE (per il frontend)
# ==============================================================================
LOCATIONS = {
    'A': {
        'name': 'Edificio A',
        'floors': {
            '1': { 'name': 'Piano 1', 'rooms': [{'id': f'A-1-{i}', 'name': f'Aula A-1-{i}'} for i in range(1, 9)]},
            '0': { 'name': 'Piano Terra', 'rooms': [{'id': f'A-S-{i}', 'name': f'Aula A-S-{i}'} for i in [1, 2, 3, 6, 7, 8]]},
            '-1': { 'name': 'Piano -1', 'rooms': [{'id': f'A-T-{i}', 'name': f'Aula A-T-{i}'} for i in range(1, 12)]}
        }
    },
    'SBA': {
        'name': 'Edificio SBA',
        'floors': {
            '2': {'name': 'Piano 2', 'rooms': [{'id': f'SBA-2-{i}', 'name': f'Aula SBA-2-{i}'} for i in range(1, 6)]},
            '1': {'name': 'Piano 1', 'rooms': [{'id': f'SBA-1-{i}', 'name': f'Aula SBA-1-{i}'} for i in range(1, 5)]},
            'T': {'name': 'Piano Terra', 'rooms': [{'id': f'SBA-T-{i}', 'name': f'Aula SBA-T-{i}'} for i in range(1, 5)]}
        }
    },
    'B': {
        'name': 'Edificio B',
        'floors': {
            '3': {'name': 'Piano 3', 'rooms': [{'id': 'B-3-1', 'name': 'Aula B-3-1'}, {'id': 'B-3-2', 'name': 'Aula B-3-2'}, {'id': 'B-3-24', 'name': 'Aula B-3-24'}]},
            '1': {'name': 'Piano 1', 'rooms': [{'id': 'B-1-1', 'name': 'Aula B-1-1'}, {'id': 'B-1-2', 'name': 'Aula B-1-2'}, {'id': 'B-1-3', 'name': 'Aula B-1-3'}, {'id': 'B-1-10', 'name': 'Aula B-1-10'}]}
        }
    }
}

# ==============================================================================
# 2. DEFINIZIONE DELLE MAPPE E DEI NODI DEL GRAFO (per il backend)
# ==============================================================================

# PASSO 1: Assicurati che i percorsi e le dimensioni delle tue mappe siano corretti
MAPS = {
    'map_A_piano_m1': {'floorplan_url': '/totem/assets/maps/edificio-a-piano-m1.svg', 'dimensions': {'width': 1500, 'height': 1000}},
    'map_A_piano_0': {'floorplan_url': '/totem/assets/maps/edificio-a-piano-0.svg', 'dimensions': {'width': 1500, 'height': 1000}},
    'map_A_piano_1': {'floorplan_url': '/totem/assets/maps/edificio-a-piano-1.svg', 'dimensions': {'width': 1500, 'height': 1000}},
    'map_SBA_piano_T': {'floorplan_url': '/totem/assets/maps/edificio-sba-piano-t.svg', 'dimensions': {'width': 1200, 'height': 1600}},
    'map_SBA_piano_1': {'floorplan_url': '/totem/assets/maps/edificio-sba-piano-1.svg', 'dimensions': {'width': 1200, 'height': 1600}},
    'map_SBA_piano_2': {'floorplan_url': '/totem/assets/maps/edificio-sba-piano-2.svg', 'dimensions': {'width': 1200, 'height': 1600}},
    'map_B_piano_1': {'floorplan_url': '/totem/assets/maps/edificio-b-piano-1.svg', 'dimensions': {'width': 1800, 'height': 1200}},
    'map_B_piano_3': {'floorplan_url': '/totem/assets/maps/edificio-b-piano-3.svg', 'dimensions': {'width': 1800, 'height': 1200}},
}

# PASSO 2: Sostituisci le coordinate fittizie con quelle reali delle tue mappe
NODES = {
    # --- Punti di partenza Totem ---
    'totem_A_ingresso': {'map_id': 'map_A_piano_0', 'coords': (750, 950)},
    'totem_B_ingresso': {'map_id': 'map_B_piano_1', 'coords': (200, 600)},
    'totem_SBA_ingresso': {'map_id': 'map_SBA_piano_T', 'coords': (600, 1500)},

    # --- Nodi Comuni (Scale/Ascensori) ---
    'scala_A_m1': {'map_id': 'map_A_piano_m1', 'coords': (1400, 500)},
    'scala_A_0': {'map_id': 'map_A_piano_0', 'coords': (1400, 500)},
    'scala_A_1': {'map_id': 'map_A_piano_1', 'coords': (1400, 500)},
    'scala_SBA_T': {'map_id': 'map_SBA_piano_T', 'coords': (200, 800)},
    'scala_SBA_1': {'map_id': 'map_SBA_piano_1', 'coords': (200, 800)},
    'scala_SBA_2': {'map_id': 'map_SBA_piano_2', 'coords': (200, 800)},
    'scala_B_1': {'map_id': 'map_B_piano_1', 'coords': (900, 200)},
    'scala_B_3': {'map_id': 'map_B_piano_3', 'coords': (900, 200)},

    # --- EDIFICIO A ---
    'A-T-1': {'map_id': 'map_A_piano_m1', 'coords': (200, 200)}, 'A-T-2': {'map_id': 'map_A_piano_m1', 'coords': (400, 200)}, 'A-T-3': {'map_id': 'map_A_piano_m1', 'coords': (600, 200)},
    'A-T-4': {'map_id': 'map_A_piano_m1', 'coords': (800, 200)}, 'A-T-5': {'map_id': 'map_A_piano_m1', 'coords': (1000, 200)},'A-T-6': {'map_id': 'map_A_piano_m1', 'coords': (1200, 200)},
    'A-T-7': {'map_id': 'map_A_piano_m1', 'coords': (200, 800)}, 'A-T-8': {'map_id': 'map_A_piano_m1', 'coords': (400, 800)}, 'A-T-9': {'map_id': 'map_A_piano_m1', 'coords': (600, 800)},
    'A-T-10': {'map_id': 'map_A_piano_m1', 'coords': (800, 800)},'A-T-11': {'map_id': 'map_A_piano_m1', 'coords': (1000, 800)},
    'A-S-1': {'map_id': 'map_A_piano_0', 'coords': (300, 300)}, 'A-S-2': {'map_id': 'map_A_piano_0', 'coords': (500, 300)}, 'A-S-3': {'map_id': 'map_A_piano_0', 'coords': (700, 300)},
    'A-S-6': {'map_id': 'map_A_piano_0', 'coords': (900, 300)}, 'A-S-7': {'map_id': 'map_A_piano_0', 'coords': (1100, 300)},'A-S-8': {'map_id': 'map_A_piano_0', 'coords': (1300, 300)},
    'A-1-1': {'map_id': 'map_A_piano_1', 'coords': (300, 300)}, 'A-1-2': {'map_id': 'map_A_piano_1', 'coords': (500, 300)}, 'A-1-3': {'map_id': 'map_A_piano_1', 'coords': (700, 300)},
    'A-1-4': {'map_id': 'map_A_piano_1', 'coords': (900, 300)}, 'A-1-5': {'map_id': 'map_A_piano_1', 'coords': (300, 800)}, 'A-1-6': {'map_id': 'map_A_piano_1', 'coords': (500, 800)},
    'A-1-7': {'map_id': 'map_A_piano_1', 'coords': (700, 800)}, 'A-1-8': {'map_id': 'map_A_piano_1', 'coords': (900, 800)},

    # --- EDIFICIO SBA ---
    'SBA-T-1': {'map_id': 'map_SBA_piano_T', 'coords': (400, 1200)}, 'SBA-T-2': {'map_id': 'map_SBA_piano_T', 'coords': (800, 1200)},
    'SBA-T-3': {'map_id': 'map_SBA_piano_T', 'coords': (400, 400)}, 'SBA-T-4': {'map_id': 'map_SBA_piano_T', 'coords': (800, 400)},
    'SBA-1-1': {'map_id': 'map_SBA_piano_1', 'coords': (400, 1200)}, 'SBA-1-2': {'map_id': 'map_SBA_piano_1', 'coords': (800, 1200)},
    'SBA-1-3': {'map_id': 'map_SBA_piano_1', 'coords': (400, 400)}, 'SBA-1-4': {'map_id': 'map_SBA_piano_1', 'coords': (800, 400)},
    'SBA-2-1': {'map_id': 'map_SBA_piano_2', 'coords': (400, 1400)}, 'SBA-2-2': {'map_id': 'map_SBA_piano_2', 'coords': (800, 1400)},
    'SBA-2-3': {'map_id': 'map_SBA_piano_2', 'coords': (400, 800)}, 'SBA-2-4': {'map_id': 'map_SBA_piano_2', 'coords': (800, 800)},
    'SBA-2-5': {'map_id': 'map_SBA_piano_2', 'coords': (600, 200)},
    
    # --- EDIFICIO B ---
    'B-1-1': {'map_id': 'map_B_piano_1', 'coords': (400, 400)}, 'B-1-2': {'map_id': 'map_B_piano_1', 'coords': (700, 400)},
    'B-1-3': {'map_id': 'map_B_piano_1', 'coords': (1000, 400)},'B-1-10': {'map_id': 'map_B_piano_1', 'coords': (1300, 400)},
    'B-3-1': {'map_id': 'map_B_piano_3', 'coords': (400, 800)}, 'B-3-2': {'map_id': 'map_B_piano_3', 'coords': (700, 800)},
    'B-3-24': {'map_id': 'map_B_piano_3', 'coords': (1000, 800)},
}

# PASSO 3: Definisci i collegamenti tra i nodi (corridoi, scale).
EDGES = [
    # --- Collegamenti Comuni (tra piani diversi) ---
    ('scala_A_m1', 'scala_A_0', 15), ('scala_A_0', 'scala_A_1', 15),
    ('scala_SBA_T', 'scala_SBA_1', 15), ('scala_SBA_1', 'scala_SBA_2', 15),
    ('scala_B_1', 'scala_B_3', 25), # Più piani = costo maggiore

    # --- EDIFICIO A ---
    ('totem_A_ingresso', 'scala_A_0', 30),
    ('scala_A_m1', 'A-T-1', 20),('scala_A_m1', 'A-T-7', 20),
    ('scala_A_0', 'A-S-1', 20), ('scala_A_0', 'A-S-8', 20),
    ('scala_A_1', 'A-1-1', 20), ('scala_A_1', 'A-1-5', 20),
    
    # --- EDIFICIO SBA ---
    ('totem_SBA_ingresso', 'SBA-T-1', 20), ('totem_SBA_ingresso', 'SBA-T-2', 20),
    ('totem_SBA_ingresso', 'scala_SBA_T', 30),
    ('scala_SBA_T', 'SBA-T-3', 15), ('scala_SBA_T', 'SBA-T-4', 15),
    ('scala_SBA_1', 'SBA-1-1', 15), ('scala_SBA_1', 'SBA-1-2', 15),
    ('scala_SBA_2', 'SBA-2-3', 10), ('scala_SBA_2', 'SBA-2-5', 25),

    # --- EDIFICIO B ---
    ('totem_B_ingresso', 'B-1-2', 20), ('totem_B_ingresso', 'scala_B_1', 40),
    ('scala_B_1', 'B-1-1', 30), ('scala_B_1', 'B-1-10', 30),
    ('scala_B_3', 'B-3-2', 20),
]
import sqlite3

conn = sqlite3.connect("../chroma/chroma.sqlite3")
cur = conn.cursor()

tables = [row[0] for row in cur.execute(
    "SELECT name FROM sqlite_master WHERE type='table';"
)]

for table in tables:
    print(f"\n=== {table} ===")
    cur.execute(f"PRAGMA table_info({table})")
    for col in cur.fetchall():
        print(col)

for table in tables:
    print(f"\n=== {table} ===")

    try:
        cur.execute(f"SELECT * FROM {table} LIMIT 10")
        rows = cur.fetchall()

        for row in rows:
            print(row)

    except Exception as e:
        print(f"Error reading {table}: {e}")
from langchain_community.embeddings import OllamaEmbeddings
import re
import os
import json

SESSIONS_FILE = os.path.join(os.path.dirname(__file__), "sessions.json")
PARENT_DIR = os.path.join(os.path.dirname(__file__), "..")

def get_embedding_function():
    return OllamaEmbeddings(model="nomic-embed-text")

def strip_think(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

def resolve_path(path: str) -> str:
    if os.path.isabs(path):
        return path
    return os.path.normpath(os.path.join(PARENT_DIR, path))

def load_sessions():
    if not os.path.exists(SESSIONS_FILE):
        return []
    with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
        return json.load(f).get("sessions", [])

def save_sessions(sessions):
    with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump({"sessions": sessions}, f, indent=2, ensure_ascii=False)






from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain_community.document_loaders import (
    PyPDFDirectoryLoader,
    PyPDFLoader,
    TextLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
    CSVLoader,
    UnstructuredHTMLLoader,
    UnstructuredMarkdownLoader,
    UnstructuredFileLoader,   # fallback
)

import tempfile

# For now, just text stuffs (.txt, .pdf, .csv, .md) 
# (If you are a developer reading this (LOL, like someone would ACTUALLY read my code), you have to install each of the other required library, then uncomment the respective file)

LOADERS = {
    ".pdf": PyPDFLoader,
    ".txt": TextLoader,
    # ".docx": UnstructuredWordDocumentLoader,
    # ".pptx": UnstructuredPowerPointLoader,
    ".csv": CSVLoader,
    # ".html": UnstructuredHTMLLoader,
    # ".htm": UnstructuredHTMLLoader,
    ".md": UnstructuredMarkdownLoader,
}

def get_loader(file_path: str, ext:str):
    loader_cls = LOADERS.get(ext)
    #fallback for everything else
    if loader_cls is None:
        return UnstructuredFileLoader(file_path)

    return loader_cls(file_path)

def split_documents(documents: list[Document]):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=80,
        length_function=len,
        is_separator_regex=False,
    )
    return text_splitter.split_documents(documents)

def add_to_chroma(chunks: list[Document], db):

    chunks_with_ids = calculate_chunk_ids(chunks)

    existing_items = db.get(include=[])  #IDs are always included by default
    existing_ids = set(existing_items["ids"])
    print(f"Number of existing documents in DB: {len(existing_ids)}")

    new_chunks = []
    for chunk in chunks_with_ids:
        if chunk.metadata["id"] not in existing_ids:
            new_chunks.append(chunk)

    if len(new_chunks):
        # print(f"Adding new documents: {len(new_chunks)}")
        new_chunk_ids = [chunk.metadata["id"] for chunk in new_chunks]
        db.add_documents(new_chunks, ids=new_chunk_ids)
    else:
        ...
        print("No new documents to add")

def calculate_chunk_ids(chunks):

    # This will create IDs like "data/monopoly.pdf:6:2"
    # Page Source : Page Number : Chunk Index

    last_page_id = None
    current_chunk_index = 0

    for chunk in chunks:
        source = chunk.metadata.get("source")
        page = chunk.metadata.get("page") or 0
        current_page_id = f"{source}:{page}"

        #If the page ID is the same as the last one, increment the index.
        if current_page_id == last_page_id:
            current_chunk_index += 1
        else:
            current_chunk_index = 0

        chunk_id = f"{current_page_id}:{current_chunk_index}"
        last_page_id = current_page_id

        chunk.metadata["id"] = chunk_id

    return chunks

def add_files_to_db(files:list[Document], db):
    documents = []
    for file in files:
        # print(file.read())
        ext = os.path.splitext(file.filename)[1].lower()

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=ext
        ) as tmp:
            file.save(tmp.name)
            temp_path = tmp.name
        try:
            loader = get_loader(temp_path, ext)

            if loader:
                docs = loader.load()
                for doc in docs:
                    doc.metadata["source"] = file.filename
                documents.extend(docs)

        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    chunks = split_documents(documents)
    add_to_chroma(chunks, db)
    print("Added files")
    ...
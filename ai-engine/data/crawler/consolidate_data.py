import os
import json
import re
from bs4 import BeautifulSoup

def consolidate_metadata():
    documents_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'raw_data', 'documents'))
    output_file = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'mobile', 'assets', 'data', 'documents.json'))
    
    documents = []
    
    for doc_dir in os.listdir(documents_dir):
        metadata_path = os.path.join(documents_dir, doc_dir, 'metadata.json')
        page_content_path = os.path.join(documents_dir, doc_dir, 'page_content.html')
        
        if os.path.exists(metadata_path) and os.path.exists(page_content_path):
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)

            with open(page_content_path, 'r', encoding='utf-8') as f:
                page_content = f.read()

            soup = BeautifulSoup(page_content, 'html.parser')
            content_div = soup.find('div', class_='prose max-w-full')
            parsed_html_content = str(content_div) if content_div else ''

            if 'metadata' in metadata and 'diagram' in metadata['metadata']:
                diagram = metadata['metadata']['diagram']
                related_documents = metadata['metadata'].get('related_documents', {})
                linked_documents_set = set()
                for key in related_documents:
                    if isinstance(related_documents[key], list):
                        for doc in related_documents[key]:
                            if isinstance(doc, dict) and '_id' in doc:
                                linked_documents_set.add(doc['_id'])

                # Also extract linked document ids from anchor hrefs inside the html content
                # Expecting last path segment to be a Mongo-like 24-hex id
                id_regex = re.compile(r"([a-fA-F0-9]{24})$")
                html_for_links = parsed_html_content or metadata['metadata'].get('html_content', '')
                if html_for_links:
                    links_soup = BeautifulSoup(html_for_links, 'html.parser')
                    for a in links_soup.find_all('a', href=True):
                        href = a['href'] or ''
                        last_segment = href.rstrip('/').split('/')[-1]
                        match = id_regex.search(last_segment)
                        if match:
                            linked_documents_set.add(match.group(1))

                doc_data = {
                    "id": metadata['metadata'].get('_id'),
                    "tieu_de": metadata.get('title'),
                    "so_hieu": diagram.get('so_hieu', 'N/A'),
                    "loai_van_ban": diagram.get('loai_van_ban', 'N/A'),
                    "noi_ban_hanh": diagram.get('noi_ban_hanh', 'N/A'),
                    "ngay_ban_hanh": diagram.get('ngay_ban_hanh', 'N/A'),
                    "tinh_trang": diagram.get('tinh_trang', 'N/A'),
                    # Prefer parsed content from page_content.html, fallback to metadata html_content
                    "html_content": parsed_html_content or metadata['metadata'].get('html_content', ''),
                    "linked_documents": sorted(linked_documents_set)
                }
                documents.append(doc_data)
                
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(documents, f, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    consolidate_metadata()
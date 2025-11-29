
import os
import argparse
from text_cleaner import TextCleaner

def process_directory(input_dir: str, force: bool):
    """
    Processes all 'content.txt' files in a directory and saves a cleaned version.

    Args:
        input_dir (str): The path to the directory containing the document folders.
        force (bool): If True, re-processes all files even if they have been cleaned.
    """
    cleaner = TextCleaner()
    print(f"Starting to process directory: {input_dir}")
    skipped_count = 0
    processed_count = 0

    for root, _, files in os.walk(input_dir):
        for file in files:
            if file == 'content.txt':
                input_path = os.path.join(root, file)
                output_path = os.path.join(root, 'cleaned_content.txt')

                if not force and os.path.exists(output_path):
                    skipped_count += 1
                    continue # Skip if already cleaned and not forcing
                
                try:
                    with open(input_path, 'r', encoding='utf-8') as f:
                        raw_text = f.read()
                    
                    cleaned_text = cleaner.clean_text(raw_text)
                    
                    with open(output_path, 'w', encoding='utf-8') as f:
                        f.write(cleaned_text)
                    
                    processed_count += 1
                    print(f"Successfully cleaned: {input_path}")

                except Exception as e:
                    print(f"Error processing {input_path}: {e}")
    
    print(f"\nCleaning complete. Processed: {processed_count}, Skipped: {skipped_count}")

def main():
    """
    Main function to run the cleaner script from the command line.
    """
    parser = argparse.ArgumentParser(description='Clean all content.txt files in a directory.')
    parser.add_argument('input_dir', type=str, help='The path to the input directory (e.g., ../raw_data/documents).')
    parser.add_argument('--force', action='store_true', help='Force re-cleaning of all documents, even if they have already been processed.')
    args = parser.parse_args()

    if not os.path.isdir(args.input_dir):
        print(f"Error: Input directory not found at {args.input_dir}")
        return

    process_directory(args.input_dir, args.force)

if __name__ == "__main__":
    main()

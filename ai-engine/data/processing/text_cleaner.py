"""
This module provides a TextCleaner class for cleaning raw text data.

The cleaning process includes:
- Removing HTML tags.
- Removing special characters and punctuation.
- Normalizing whitespace.
"""
import re
import argparse
from bs4 import BeautifulSoup

class TextCleaner:
    """A class to clean raw text data, specifically tailored for Vietnamese legal documents."""

    def __init__(self):
        """Initializes the TextCleaner with predefined regex patterns."""
        # Keeps Vietnamese characters, numbers, and essential punctuation for legal text.
        self.special_char_remover = re.compile(r'[^\w\s.,;:"“”‘’()-]')
        # Matches specific boilerplate text to be removed.
        self.unwanted_text_remover = re.compile(r'(HỘI ĐỒNG NHÂN DÂN TỈNH BÌNH ĐỊNH|CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM|Độc lập - Tự do - Hạnh phúc|Số:.*|Bình Định, ngày.*|NGHỊ QUYẾT|HỘI ĐỒNG NHÂN DÂN TỈNH.*|Căn cứ Luật.*|Xét Tờ trình.*|QUYẾT NGHỊ:|Điều 2.*|Điều 3.*|CHỦ TỊCH.*|Hết hiệu lực)')

    def remove_html_tags(self, text: str) -> str:
        """Removes HTML tags from a string using BeautifulSoup."""
        return BeautifulSoup(text, "html.parser").get_text()

    def remove_unwanted_text(self, text: str) -> str:
        """Removes specific boilerplate or irrelevant phrases from the text."""
        return self.unwanted_text_remover.sub('', text)

    def normalize_whitespace(self, text: str) -> str:
        """Collapses multiple whitespace characters into a single space and removes leading/trailing spaces."""
        text = re.sub(r'\s*\n\s*', '\n', text)  # Normalize newlines
        text = re.sub(r'[ \t]+', ' ', text)  # Collapse spaces and tabs
        return text.strip()

    def remove_extra_punctuation(self, text: str) -> str:
        """Removes redundant consecutive punctuation."""
        text = re.sub(r'\.{2,}', '.', text)
        text = re.sub(r',{2,}', ',', text)
        text = re.sub(r'-{2,}', '-', text)
        return text

    def clean_text(self, text: str) -> str:
        """
        Applies the full text cleaning pipeline to a string.
        The pipeline is designed to be modular and ordered for optimal cleaning.
        """
        cleaning_pipeline = [
            self.remove_html_tags,
            self.remove_unwanted_text,
            self.remove_extra_punctuation,
            self.normalize_whitespace,
        ]

        for clean_func in cleaning_pipeline:
            text = clean_func(text)
            
        return text

def main():
    """
    Main function to run the text cleaner from the command line.
    """
    parser = argparse.ArgumentParser(description='Clean text data from a file.')
    parser.add_argument('input_file', type=str, help='The path to the input file.')
    parser.add_argument('output_file', type=str, help='The path to the output file.')
    args = parser.parse_args()

    cleaner = TextCleaner()

    try:
        with open(args.input_file, 'r', encoding='utf-8') as f:
            raw_text = f.read()
        
        cleaned_text = cleaner.clean_text(raw_text)

        with open(args.output_file, 'w', encoding='utf-8') as f:
            f.write(cleaned_text)
            
        print(f"Successfully cleaned {args.input_file} and saved to {args.output_file}")

    except FileNotFoundError:
        print(f"Error: Input file not found at {args.input_file}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()

import os
import glob
from pathlib import Path

def generate_html_index(output_file='myhtml.html'):
    """
    Scans the repository for all HTML files (excluding the output file itself)
    and generates an index HTML file with buttons to link to them.
    """
    
    # Start of the HTML content
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Index</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .container {{ max-width: 800px; margin: auto; }}
        .app-button {{
            display: block;
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            text-align: left;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            cursor: pointer;
            text-decoration: none;
            color: #333;
            font-size: 16px;
            border-radius: 5px;
            transition: background-color 0.3s;
        }}
        .app-button:hover {{
            background-color: #ddd;
        }}
        h1 {{ border-bottom: 2px solid #ccc; padding-bottom: 10px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Available Applications</h1>
        <p>Click a button to "simulate" or view the application.</p>
        <div>
"""
    
    # Find all HTML files recursively, excluding the output file
    # Use Path().rglob to find files relative to the current working directory
    # which is the repository root in the GitHub Action
    html_files = [
        Path(p).as_posix() # Use posix path for cross-OS compatibility in HTML links
        for p in glob.glob('**/*.html', recursive=True)
        if Path(p).name != output_file
    ]
    
    # Generate buttons for each found HTML file
    if not html_files:
        html_content += f'<p>No other HTML files found in the repository (excluding {output_file}).</p>'
    else:
        for file_path in sorted(html_files):
            # Create a user-friendly label
            label = Path(file_path).stem.replace('-', ' ').replace('_', ' ').title()
            
            # The button links to the file path
            html_content += f'            <a href="{file_path}" class="app-button" role="button" aria-label="Simulate {label}">{label} - Simulate Application 🚀</a>\n'

    # End of the HTML content
    html_content += """        </div>
    </div>
</body>
</html>"""

    # Write the content to the specified output file
    with open(output_file, 'w') as f:
        f.write(html_content)

    print(f"Successfully generated {output_file} with {len(html_files)} links.")

if __name__ == "__main__":
    generate_html_index()

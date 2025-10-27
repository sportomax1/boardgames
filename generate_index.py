import os
import glob
from pathlib import Path
from datetime import datetime, timezone

def format_time_since(delta):
    """Converts a timedelta object to a user-friendly 'time since' string."""
    seconds = int(delta.total_seconds())
    
    if seconds < 60:
        return "Just now"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    else:
        days = seconds // 86400
        return f"{days} day{'s' if days > 1 else ''} ago"

def generate_html_index(output_file='myhtml.html'):
    """
    Scans for all HTML files, sorts them by modification date (newest first),
    and generates an index file with client-side sorting controls.
    """
    
    # --- Start of HTML content ---
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Index (Sorted by Update)</title>
    <style>
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 20px; 
            background-color: #fdfdfd;
            color: #333;
        }}
        .container {{ max-width: 800px; margin: auto; }}
        h1 {{ 
            border-bottom: 2px solid #eee; 
            padding-bottom: 10px; 
        }}
        
        /* --- Sorting Button Styles --- */
        .sort-controls {{
            margin-bottom: 20px;
        }}
        .sort-btn {{
            padding: 8px 12px;
            font-size: 14px;
            border: 1px solid #ccc;
            background-color: #f7f7f7;
            border-radius: 6px;
            cursor: pointer;
            margin-right: 5px;
            transition: background-color 0.2s, box-shadow 0.2s;
        }}
        .sort-btn:hover {{
            background-color: #eee;
        }}
        .sort-btn.active {{
            background-color: #0366d6;
            color: white;
            border-color: #0366d6;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }}
        /* --- End Sorting Button Styles --- */

        .app-entry {{
            border: 1px solid #ddd;
            border-radius: 8px;
            margin-bottom: 15px;
            background-color: #fff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            transition: box-shadow 0.2s ease;
        }}
        .app-entry:hover {{
            box-shadow: 0 3px 6px rgba(0,0,0,0.08);
        }}

        .app-button {{
            display: block;
            width: 100%;
            padding: 12px 15px;
            text-align: left;
            background-color: #f9f9f9;
            border: none;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            text-decoration: none;
            color: #0366d6;
            font-size: 16px;
            font-weight: 600;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
        }}
        .app-button:hover {{
            background-color: #f0f6fc;
        }}

        .file-info {{
            padding: 10px 15px;
            font-size: 13px;
            color: #555;
            line-height: 1.6;
        }}
        .file-info strong {{ color: #222; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Available Applications</h1>
        <p>Click a button to view the application. Default sort is by last file update (newest first).</p>
        
        <!-- Sorting Controls -->
        <div class="sort-controls">
            <button id="sortByUpdate" class="sort-btn active">Sort by Last Update (Newest)</button>
            <button id="sortByName" class="sort-btn">Sort by Name (A-Z)</button>
        </div>

        <!-- Container for App Entries -->
        <div id="app-list">
"""
    
    # 1. Find all HTML files
    all_files = glob.glob('**/*.html', recursive=True)
    
    # 2. Get stats and filter out the output file
    file_stats = []
    now_utc = datetime.now(timezone.utc)
    
    for file_path_str in all_files:
        path_obj = Path(file_path_str)
        if path_obj.name == output_file:
            continue
            
        mtime_epoch = os.path.getmtime(path_obj)
        mod_time_dt_utc = datetime.fromtimestamp(mtime_epoch, timezone.utc)
        app_name_label = path_obj.stem.replace('-', ' ').replace('_', ' ').title()

        file_stats.append({
            'path': path_obj.as_posix(),
            'mtime': mtime_epoch,
            'mod_time_str': mod_time_dt_utc.strftime('%Y-%m-%d %H:%M:%S UTC'),
            'time_since': format_time_since(now_utc - mod_time_dt_utc),
            'app_name_lower': app_name_label.lower()
        })

    # 3. Sort the list by modification time (mtime), descending (This is the default)
    sorted_files = sorted(file_stats, key=lambda x: x['mtime'], reverse=True)

    # 4. Generate HTML for each file
    if not sorted_files:
        html_content += '<p>No other HTML files found.</p>'
    else:
        for file_data in sorted_files:
            file_path = file_data['path']
            app_name_label = file_data['app_name_lower'].title()
            
            # Button text (no emoji)
            button_text = f"{app_name_label} - Simulate Application"
            
            # Add data- attributes for JavaScript sorting
            html_content += f"""
            <div class="app-entry" data-mtime="{file_data['mtime']}" data-name="{file_data['app_name_lower']}">
                <a href="{file_path}" class="app-button" role="button">{button_text}</a>
                <div class="file-info">
                    <strong>App Name:</strong> {app_name_label}<br>
                    <strong>File Name:</strong> {file_path}<br>
                    <strong>Last Update:</strong> {file_data['mod_time_str']} ({file_data['time_since']})
                </div>
            </div>
"""

    # End of the app list
    html_content += "        </div> <!-- /#app-list -->\n"
    
    # --- JavaScript for Sorting ---
    html_content += """
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const btnSortUpdate = document.getElementById('sortByUpdate');
            const btnSortName = document.getElementById('sortByName');
            const appListContainer = document.getElementById('app-list');

            function sortItems(criteria) {
                // Get all app entries from the container
                const items = Array.from(appListContainer.querySelectorAll('.app-entry'));
                
                let sortedItems;

                if (criteria === 'name') {
                    // Sort by data-name attribute (A-Z)
                    sortedItems = items.sort((a, b) => {
                        return a.dataset.name.localeCompare(b.dataset.name);
                    });
                    // Update button active state
                    btnSortName.classList.add('active');
                    btnSortUpdate.classList.remove('active');
                } else { // Default to 'update'
                    // Sort by data-mtime attribute (Newest first)
                    sortedItems = items.sort((a, b) => {
                        // b - a for descending order (newest first)
                        return b.dataset.mtime - a.dataset.mtime;
                    });
                    // Update button active state
                    btnSortUpdate.classList.add('active');
                    btnSortName.classList.remove('active');
                }

                // Re-append sorted items to the container
                sortedItems.forEach(item => {
                    appListContainer.appendChild(item);
                });
            }

            // Add click event listeners
            btnSortUpdate.addEventListener('click', () => sortItems('update'));
            btnSortName.addEventListener('click', () => sortItems('name'));
        });
    </script>
"""
    # --- End of JavaScript ---

    # End of the HTML content
    html_content += """
    </div> <!-- /.container -->
</body>
</html>
"""

    # Write the content to the specified output file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"Successfully generated {output_file} with {len(sorted_files)} links and sorting controls.")

if __name__ == "__main__":
    generate_html_index()

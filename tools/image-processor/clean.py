import os
import json
import shutil
from datetime import datetime
import argparse

def cleanup_v2(backup=True, confirm=True, metadata_only=False, fix_points=False):
    """
    Clean up all V2 ground-breaking data and start fresh.
    
    Args:
        backup: If True, create a backup of existing data before modifying
        confirm: If True, ask for confirmation before changes
        metadata_only: If True, only process the metadata file, not images
        fix_points: If True, attempt to fix pixel coordinates to percentages
    """
    # Define paths
    base_dir = "/Users/admin/Documents/GitHub/hal-xing.github.io"
    v2_dir = os.path.join(base_dir, "img/ground_breaking/v2")
    processed_dir = os.path.join(v2_dir, "processed")
    metadata_file = os.path.join(v2_dir, "metadata.json")
    
    # Check if there's anything to clean up
    has_processed = os.path.exists(processed_dir) and os.listdir(processed_dir)
    has_metadata = os.path.exists(metadata_file)
    
    if not has_processed and not has_metadata:
        print("No V2 data found. Nothing to clean up.")
        return
    
    # Count items to be removed
    processed_count = len(os.listdir(processed_dir)) if has_processed else 0
    
    # Display summary
    print("\n=== V2 CLEANUP SUMMARY ===")
    if not metadata_only:
        print(f"Processed images to remove: {processed_count}")
    
    if fix_points and has_metadata:
        print("Action: Convert pixel coordinates to percentages")
    else:
        print(f"Metadata file to reset: {'Yes' if has_metadata else 'No'}")
    
    # Ask for confirmation if needed
    if confirm:
        action = "convert point coordinates" if fix_points else "reset metadata"
        if metadata_only:
            message = f"\nThis will {action}. Continue? (y/n): "
        else:
            message = f"\nThis will remove all V2 processed images and {action}. Continue? (y/n): "
        
        response = input(message)
        if response.lower() != 'y':
            print("Operation canceled.")
            return
    
    # Create backup if requested
    if backup and (has_processed or has_metadata):
        backup_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = os.path.join(base_dir, f"img/ground_breaking/v2_backup_{backup_timestamp}")
        
        print(f"\nCreating backup in: {backup_dir}")
        os.makedirs(backup_dir, exist_ok=True)
        
        # Backup processed images
        if has_processed and not metadata_only:
            processed_backup = os.path.join(backup_dir, "processed")
            shutil.copytree(processed_dir, processed_backup)
        
        # Backup metadata
        if has_metadata:
            shutil.copy2(metadata_file, os.path.join(backup_dir, "metadata.json"))
        
        print("Backup created successfully.")
    
    # Clean up processed images (if not metadata only)
    if has_processed and not metadata_only:
        print("\nRemoving processed images...")
        shutil.rmtree(processed_dir)
        os.makedirs(processed_dir, exist_ok=True)
    
    # Handle metadata file
    if has_metadata:
        if fix_points:
            print("\nConverting pixel coordinates to percentages...")
            try:
                # Load current metadata
                with open(metadata_file, "r") as f:
                    data = json.load(f)
                
                # Track how many entries were fixed
                fixed_count = 0
                
                # For each image entry
                for filename, entry in data.items():
                    # Skip entries without points
                    if not entry.get("points") or not entry["points"]:
                        continue
                    
                    # Check if points are already percentages
                    all_points_percentage = True
                    for point in entry["points"]:
                        if len(point) >= 2 and (point[0] > 1.0 or point[1] > 1.0):
                            all_points_percentage = False
                            break
                    
                    # Skip if already in percentage format
                    if all_points_percentage:
                        continue
                    
                    # Convert points to percentages using 800 as standard size
                    standard_width = 800
                    standard_height = 800
                    
                    # Convert to percentages
                    entry["points"] = [
                        [point[0] / standard_width, point[1] / standard_height]
                        for point in entry["points"]
                    ]
                    
                    # If we have exactly 2 points, ensure top (0.0) and bottom (1.0)
                    if len(entry["points"]) == 2:
                        # Sort by y-coordinate
                        entry["points"].sort(key=lambda p: p[1])
                        # Force first point to top, second to bottom
                        entry["points"][0][1] = 0.0
                        entry["points"][1][1] = 1.0
                    
                    fixed_count += 1
                
                # Save the updated metadata
                with open(metadata_file, "w") as f:
                    json.dump(data, f, indent=2)
                
                print(f"Fixed {fixed_count} entries in metadata.json")
                
            except Exception as e:
                print(f"Error fixing metadata: {e}")
        else:
            # Reset metadata file
            print("Resetting metadata file...")
            with open(metadata_file, "w") as f:
                json.dump({}, f)
    
    # Ensure directories exist
    if not metadata_only:
        for directory in [v2_dir, processed_dir]:
            os.makedirs(directory, exist_ok=True)
    
    # Create a clear signal file that the marker will check
    with open(os.path.join(v2_dir, ".reset_complete"), "w") as f:
        f.write(datetime.now().isoformat())
    
    print("Created reset signal file for the marker tool")
    
    print("\n✅ V2 cleanup/fix complete.")
    if not fix_points:
        print("\nNext steps:")
        print("1. Run image_marker.py")
        print("2. Select a folder with new source images")
        print("3. Process your images with clean, consistent point marking")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Clean up or fix Ground Breaking V2 data')
    parser.add_argument('--no-backup', action='store_true', help='Skip backup creation')
    parser.add_argument('--force', action='store_true', help='Skip confirmation prompt')
    parser.add_argument('--metadata-only', action='store_true', help='Only process metadata, leave images alone')
    parser.add_argument('--fix-points', action='store_true', help='Fix pixel coordinates to percentages instead of resetting')
    
    args = parser.parse_args()
    
    cleanup_v2(
        backup=not args.no_backup, 
        confirm=not args.force,
        metadata_only=args.metadata_only,
        fix_points=args.fix_points
    )
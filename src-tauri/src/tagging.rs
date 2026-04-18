use image::{DynamicImage, imageops::FilterType};
use rayon::prelude::*;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

use crate::file_management::parse_virtual_path;
use crate::image_processing::ImageMetadata;

pub const COLOR_TAG_PREFIX: &str = "color:";
pub const USER_TAG_PREFIX: &str = "user:";

fn rgb_to_hsv((r, g, b): (u8, u8, u8)) -> (f32, f32, f32) {
    let r = r as f32 / 255.0;
    let g = g as f32 / 255.0;
    let b = b as f32 / 255.0;

    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let delta = max - min;

    let h = if delta.abs() < f32::EPSILON {
        0.0
    } else if (max - r).abs() < f32::EPSILON {
        60.0 * (((g - b) / delta) % 6.0)
    } else if (max - g).abs() < f32::EPSILON {
        60.0 * (((b - r) / delta) + 2.0)
    } else {
        60.0 * (((r - g) / delta) + 4.0)
    };
    let h = if h < 0.0 { h + 360.0 } else { h };

    let s = if max.abs() < f32::EPSILON {
        0.0
    } else {
        delta / max
    };
    let v = max;

    (h, s, v)
}

pub fn extract_color_tags(image: &DynamicImage) -> Vec<String> {
    let resized = image.resize(100, 100, FilterType::Triangle);
    let rgb_image = resized.to_rgb8();
    let mut color_counts: HashMap<String, u32> = HashMap::new();

    for pixel in rgb_image.pixels() {
        let rgb = (pixel[0], pixel[1], pixel[2]);
        let (h, s, v) = rgb_to_hsv(rgb);

        let color_name = if v < 0.2 {
            "black".to_string()
        } else if s < 0.1 {
            if v > 0.8 {
                "white".to_string()
            } else {
                "gray".to_string()
            }
        } else {
            match h {
                _ if !(20.0..340.0).contains(&h) => "red".to_string(),
                _ if (20.0..45.0).contains(&h) => "orange".to_string(),
                _ if (45.0..70.0).contains(&h) => "yellow".to_string(),
                _ if (70.0..160.0).contains(&h) => "green".to_string(),
                _ if (160.0..260.0).contains(&h) => "blue".to_string(),
                _ if (260.0..340.0).contains(&h) => "purple".to_string(),
                _ => "unknown".to_string(),
            }
        };

        if (color_name == "orange" || color_name == "red") && v < 0.6 && s < 0.7 {
            *color_counts.entry("brown".to_string()).or_insert(0) += 1;
        } else {
            *color_counts.entry(color_name).or_insert(0) += 1;
        }
    }

    let mut colorful_tags: Vec<(String, u32)> = color_counts
        .iter()
        .filter(|(name, _)| !matches!(name.as_str(), "black" | "white" | "gray"))
        .map(|(name, &count)| (name.clone(), count))
        .collect();

    colorful_tags.sort_by(|a, b| b.1.cmp(&a.1));

    if !colorful_tags.is_empty() {
        colorful_tags
            .into_iter()
            .take(2)
            .map(|(name, _)| name)
            .collect()
    } else {
        color_counts
            .into_iter()
            .max_by_key(|&(_, count)| count)
            .map(|(name, _)| vec![name])
            .unwrap_or_default()
    }
}

fn modify_tags_for_path(
    path_str: &str,
    modify_fn: impl Fn(&mut Vec<String>),
) -> Result<(), String> {
    let (_, sidecar_path) = parse_virtual_path(path_str);

    let mut metadata: ImageMetadata = if sidecar_path.exists() {
        fs::read_to_string(&sidecar_path)
            .ok()
            .and_then(|content| serde_json::from_str(&content).ok())
            .unwrap_or_default()
    } else {
        ImageMetadata::default()
    };

    let mut tags = metadata.tags.unwrap_or_default();
    modify_fn(&mut tags);

    tags.sort_unstable();
    tags.dedup();

    if tags.is_empty() {
        metadata.tags = None;
    } else {
        metadata.tags = Some(tags);
    }

    let json_string = serde_json::to_string_pretty(&metadata).map_err(|e| e.to_string())?;
    fs::write(sidecar_path, json_string).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_tag_for_paths(paths: Vec<String>, tag: String) -> Result<(), String> {
    paths.par_iter().for_each(|path| {
        let tag_clone = tag.clone();
        if let Err(e) = modify_tags_for_path(path, |tags| {
            if !tags.contains(&tag_clone) {
                tags.push(tag_clone.clone());
            }
        }) {
            eprintln!("Failed to add tag to {}: {}", path, e);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn remove_tag_for_paths(paths: Vec<String>, tag: String) -> Result<(), String> {
    paths.par_iter().for_each(|path| {
        let tag_clone = tag.clone();
        if let Err(e) = modify_tags_for_path(path, |tags| {
            tags.retain(|t| t != &tag_clone);
        }) {
            eprintln!("Failed to remove tag from {}: {}", path, e);
        }
    });
    Ok(())
}

#[tauri::command]
pub fn clear_ai_tags(root_path: String) -> Result<usize, String> {
    if !Path::new(&root_path).exists() {
        return Err(format!("Root path does not exist: {}", root_path));
    }

    let mut updated_count = 0;
    let walker = WalkDir::new(root_path).into_iter();

    for entry in walker.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file()
            && path.extension().and_then(|s| s.to_str()) == Some("rrdata")
            && let Ok(content) = fs::read_to_string(path)
            && let Ok(mut metadata) = serde_json::from_str::<ImageMetadata>(&content)
            && let Some(tags) = &mut metadata.tags
        {
            let original_len = tags.len();
            // Keep color tags and user tags, remove others (AI tags)
            tags.retain(|tag| {
                tag.starts_with(COLOR_TAG_PREFIX) || tag.starts_with(USER_TAG_PREFIX)
            });

            if tags.len() < original_len {
                if tags.is_empty() {
                    metadata.tags = None;
                }
                if let Ok(json_string) = serde_json::to_string_pretty(&metadata)
                    && fs::write(path, json_string).is_ok()
                {
                    updated_count += 1;
                }
            }
        }
    }
    Ok(updated_count)
}

#[tauri::command]
pub fn clear_all_tags(root_path: String) -> Result<usize, String> {
    if !Path::new(&root_path).exists() {
        return Err(format!("Root path does not exist: {}", root_path));
    }

    let mut updated_count = 0;
    let walker = WalkDir::new(root_path).into_iter();

    for entry in walker.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file()
            && path.extension().and_then(|s| s.to_str()) == Some("rrdata")
            && let Ok(content) = fs::read_to_string(path)
            && let Ok(mut metadata) = serde_json::from_str::<ImageMetadata>(&content)
            && let Some(tags) = &mut metadata.tags
        {
            let original_len = tags.len();
            // Keep only color tags, remove AI and user tags
            tags.retain(|tag| tag.starts_with(COLOR_TAG_PREFIX));

            if tags.len() < original_len {
                if tags.is_empty() {
                    metadata.tags = None;
                }
                if let Ok(json_string) = serde_json::to_string_pretty(&metadata)
                    && fs::write(path, json_string).is_ok()
                {
                    updated_count += 1;
                }
            }
        }
    }
    Ok(updated_count)
}

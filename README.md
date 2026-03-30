# SchedulerHCMUSWebCreate

SchedulerHCMUSWebCreate is the browser-based version of the original SchedulerRaylibHCMUS project.
It helps HCMUS students browse available courses, build a personal timetable, and manage schedules with JSON import/export.

## Core Idea

- Keep the SchedulerRaylibHCMUS scheduling logic, but run it in a web app.
- Read available course data directly from the root resources folder.
- Let users select courses visually and store their timetable in local storage.

Original desktop project:

- https://github.com/hongphuchcmus/SchedulerRaylibHCMUS

## Features

- Browse and search available courses.
- Add and remove classes from your timetable.
- Detect schedule conflicts and enforce per-day limits.
- Persist schedule automatically in browser local storage.
- Export your current schedule as JSON.
- Import a saved schedule JSON file.

## Data Source

The web app reads available classes from: resources/extracted_table.json

## Run Locally (JavaScript Only)

Requirements:

- Node.js 18+

Start server:

1. Open terminal at the project root.
2. Run: node server.js
3. Open: http://localhost:8080

The Node server serves:

- web app files from the web folder
- course data from the root resources folder

## Table Extraction (Chrome Extension)

Use this Chrome extension to extract open class data from the HCMUS portal: https://github.com/quanvo0112/ESTextension

1. Open Chrome and go to chrome://extensions
2. Enable Developer Mode
3. Click Load Unpacked
4. Download ESTextension, then use Load Unpacked and select its extension folder
5. On the HCMUS open class page, run the extension extraction
6. Save output to resources/extracted_table.json

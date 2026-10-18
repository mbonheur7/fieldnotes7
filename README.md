# Campus Life Planner
The live site: [Campus Life Planner] https://mbonheur7.github.io/fieldnotes7/
For automated test you can open `tests.html` through the live website or a local development server to run the test suite.

This is a responsive web application designed to help students organize their academic tasks and manage their time so to stay on top of campus life.

The Campus Life Planner allows students to create and manage tasks, set deadlines, estimate the time needed for each activity, and monitor their progress through a dashboard.

## Its Features

### First, Task Management
- Add tasks with a title, due date, estimated duration, and tag.
- Edit existing tasks and save changes.
- Delete tasks when they are no longer needed.
- Mark tasks as completed or incomplete.
- Identify overdue tasks.

### Second, Dashboard
- View the total number of tasks.
- Track completed and incomplete tasks.
- See the total planned time.
- Identify the most frequently used tag.
- Set a weekly time target and view progress.
- View planned task time across the last seven days.

### Then, Search, Filtering, and Sorting
- You can search for your own tasks using regular expressions.
- Choose whether searches should ignore uppercase and lowercase differences.
- Filter tasks by completion status and tag.
- Sort tasks by due date, title, or estimated duration.

### Settings and Data Management
- You can set a weekly time target.
- Choose whether durations are displayed in minutes or hours.
- Export task data as JSON.
- Import task data from a JSON file.
- Restore sample tasks for demonstration and testing.

### Responsive and Accessible Design
- Responsive layouts for desktop and mobile screens.
- Semantic HTML elements and labelled form controls.
- Keyboard-accessible navigation and interactive controls.
- Form validation with helpful error messages.
- Accessible status messages for important updates.

## Technologies Used

- **HTML5** — semantic page structure.
- **CSS3** — styling, responsive layouts, and interactive effects.
- **JavaScript (ES Modules)** — task management, validation, search, sorting, and dashboard calculations.
- **Local Storage** — saving tasks and settings in the browser.
- **JSON** — sample data and task import/export.

## Project Structure

```text
campus-life-planner/
├── index.html
├── about.html
├── records.html
├── task-form.html
├── settings.html
├── style.css
├── tests.html
├── README.md
└── scripts/
    ├── app.js
    ├── state.js
    ├── storage.js
    ├── ui.js
    ├── validators.js
    └── search.js
    |__ seed.js
```

## Lets get Started

### Requirements

- A modern web browser.
- Visual Studio Code or another code editor.
- A local development server to serve the project files.

### Running the Application

1. Download or clone the project repository.
2. Open the project folder in Visual Studio Code.
3. Start a local development server, for example, using the **Live Server** extension.
4. Open the application through the local server.
5. Navigate between About, Dashboard, Records, Add Task, and Settings.

**Important:** Run the project through a local server rather than opening the HTML files directly, because the application uses JavaScript modules and fetches sample data from `seed.json`.

## Using the Application

1. Open **Add Task** to create a task.
2. Enter the task title, due date, estimated duration, and tag.
3. Save the task.
4. Open **Records** to search, filter, sort, edit, complete, or delete tasks.
5. Visit **Dashboard** to review task statistics and weekly progress.
6. Open **Settings** to change your weekly target and preferred time unit.
7. Use the import and export options to manage task data.

Tasks and settings are saved in the browser's local storage. They remain available in the same browser unless the stored data is cleared or the browser environment changes.

## Testing

The application can be tested manually by checking:

- Task creation, editing, completion, and deletion.
- Form validation and error messages.
- Search, case sensitivity, filtering, and sorting.
- Dashboard statistics and weekly progress calculations.
- Data persistence after refreshing the page.
- JSON import, export, and sample-data restoration.
- Responsive layouts and keyboard navigation.

The project also includes a `tests.html` page for testing supported application functions.

### There is an automated Test Results

And the test is available at [tests.html](https://mbonheur7.github.io/fieldnotes7/tests.html).

The current test run reports **14 passed, 0 failed**. The tests cover input validation, duration conversion, regular-expression search, and invalid regular-expression handling.

### Regular Expression Validation and Search

The application uses regular expressions (regex) for input validation and task searching.

| Field | Pattern | Purpose |

Field: Title Pattern: `/^[A-Za-z0-9][A-Za-z0-9 .,'&:()\/-]{1,79}$/` Purpose: Requires 2–80 characters, beginning with a letter or number and allowing specified punctuation.
Field: Duration Pattern: `/^\d+(\.\d{1,2})?$/` Purpose: Accepts whole numbers or decimals with one or two decimal places.
Field: Date Pattern: `/^\d{4}-\d{2}-\d{2}$/` Purpose: Checks the YYYY-MM-DD date format. The application also verifies that the date exists.
Field: Tag Pattern: `/^[A-Za-z][A-Za-z -]{1,29}$/` Purpose: Requires 2–30 characters, starting with a letter and allowing letters, spaces, and hyphens.
Field: Repeated words Pattern: `/\b(\w+)\s+\1\b/i` Purpose: Uses a capturing group and backreference (`\1`) to detect consecutive repeated words, ignoring case.

The search feature compiles user-provided patterns with `new RegExp()`. It supports global matching and an optional case-insensitive mode. A `try...catch` block handles invalid patterns and displays an error message instead of allowing the application to crash.

Search matches are highlighted using DOM text nodes and `<mark>` elements. The application uses `textContent` rather than inserting user-provided text as HTML.
### Keyboard Navigation

- Use `Tab` to move forward through interactive controls.
- Use `Shift + Tab` to move backward.
- Use `Enter` or `Space` to activate supported buttons and links.
- Use the keyboard controls provided by the browser for form inputs and selection controls.

### Accessibility Notes

- Semantic HTML elements provide meaningful page structure.
- Form controls have associated labels.
- Validation errors and important status updates help users understand application feedback.
- Responsive layouts support desktop and mobile screens.
- Interactive elements should remain usable with a keyboard.


## Limitations

- Data is stored locally in the browser and is not automatically synchronized across devices.
- Clearing the browser's local storage may remove saved tasks and settings.
- Imported JSON data must follow the application's expected data structure.

## Possible future Improvements

Possible improvements include cloud synchronization, user accounts, reminders, and calendar integration.

And lastly my unlisted yutube demo video link `https://youtu.be/P7LJ47oYP8g`
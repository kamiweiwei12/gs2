# gs2 Project

## Overview
The gs2 project is a comprehensive application that integrates a React + Electron frontend with a Python FastAPI backend. It is designed to provide a seamless user experience while managing game knowledge and user habits.

## Directory Structure
- **frontend/**: Contains the React + Electron application code, including components, services, and configurations.
- **backend/**: Houses the Python FastAPI application, including the main application file, routes, models, and configurations.
- **data/**: Intended for local caching of game knowledge and user habits, may include JSON or other data files.
- **docs/**: Contains competition materials such as PPT presentations and reports.
- **scripts/**: Includes startup scripts and automation scripts for running or building the project.

## Setup Instructions
1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd gs2
   ```

2. **Frontend Setup**:
   - Navigate to the `frontend` directory.
   - Install dependencies:
     ```
     npm install
     ```
   - Start the frontend application:
     ```
     npm start
     ```

3. **Backend Setup**:
   - Navigate to the `backend` directory.
   - Create a virtual environment:
     ```
     python -m venv venv
     source venv/bin/activate  # On Windows use `venv\Scripts\activate`
     ```
   - Install dependencies:
     ```
     pip install -r requirements.txt
     ```
   - Start the FastAPI application:
     ```
     uvicorn main:app --reload
     ```

## Usage Guidelines
- Access the frontend application at `http://localhost:3000`.
- The backend API can be accessed at `http://localhost:8000`.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
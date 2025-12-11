# 🍞 Shokupan Calculator

> **The ultimate dough calculator for the modern baker.**  
> *Precise Baker's Math. Customizable Pans. Beautiful Design.*

![Shokupan Calculator Banner](https://placehold.co/1200x400/BF9553/FFF?text=Shokupan+Calculator)

## ✨ Features

-   **🧮 Smart Baker's Percentage**: Automatically calculates flour, water, and ingredient weights based on your target hydration.
-   **🍞 Adaptive Pan Sizing**: Input your exact pan dimensions (length × width × height) to get the perfect dough volume every time.
-   **🔄 Dual Modes**:
    -   **By Volume**: Calculate theoretical dough needed for a specific pan size.
    -   **By Total Flour**: Specify your starting flour amount, and we'll tell you the dough yield.
-   **📏 Multi-Unit Support**: Seamlessly switch between **Metric** (g, cm) and **Imperial** (oz, in).
-   **🍪 Bake Mode**: A focused, high-contrast view designed for readability in the kitchen.
-   **💾 Cloud Sync**: Sign in with Google to save your custom presets and settings across devices.
-   **🌚 Dark Mode**: Easy on the eyes for late-night baking sessions.
-   **🍩 Built-in Presets**:
    -   **Classic Shokupan**: The gold standard of Japanese milk bread.
    -   **Brioche**: Rich, buttery, and decadent.
    -   **Lean Bread**: Simple essentials for rustic loaves.
    -   **Premium Shokupan**: For that extra fluffy texture using Yudane.

## 🛠 Tech Stack

Built with a focus on performance, aesthetics, and user experience.

-   **Framework**: [Next.js](https://nextjs.org/) (React)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Database**: [Firebase](https://firebase.google.com/) (Firestore & Auth)
-   **Icons**: [Material Symbols](https://fonts.google.com/icons)

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18+)
-   npm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/agolho/shokupancalculator.git
    cd shokupancalculator
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env.local` file in the root directory and add your Firebase credentials:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to see it in action.

## 🤝 Contributing

We welcome fellow bakers and developers! If you have a recipe preset request or a feature idea:
1.  Fork the repo.
2.  Create a feature branch (`git checkout -b feature/cool-new-bread`).
3.  Commit your changes.
4.  Open a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  <i>Designed with ❤️ for the love of bread.</i>
</p>

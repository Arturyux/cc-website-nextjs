module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        custom: "7px 7px 4px 1px rgba(0, 0, 0, 1);"
      },
      colors: {
        mainColor: "#B27EE9",
        mainColor2: "#FFBE5A", 
        highlighter: "#A4E454", 
        baseColor: "#7AB3DC",  
        baseColor2: "#FF8B73", 
        
      },
    },
  },
  plugins: [],
};
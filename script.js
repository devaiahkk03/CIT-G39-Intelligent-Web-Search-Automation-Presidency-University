// Dynamic resizing for the textarea
document.getElementById("prompt").addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Handle form submission
document.getElementById("searchForm").addEventListener("submit", async function (event) {
  event.preventDefault();
  const prompt = document.getElementById("prompt").value.trim();
  if (!prompt) {
    alert("Please enter a query!");
    return;
  }

  const results = document.getElementById("results");
  results.innerHTML = "<p>Loading...</p>";

  try {
    const response = await fetch("/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();
    if (response.ok) {
      const formattedContent = formatResponse(data.pageContent, data.generatedQuery);
      results.innerHTML = formattedContent;
    } else {
      results.innerHTML = "<p>Error retrieving results. Please try again.</p>";
    }

    // Scroll to results
    results.scrollIntoView({ behavior: "smooth" });

    // Add floating search query
    let floatingQuery = document.querySelector(".floating-query");
    if (!floatingQuery) {
      floatingQuery = document.createElement("div");
      floatingQuery.className = "floating-query";
      document.body.appendChild(floatingQuery);
    }
    floatingQuery.textContent = `Search Query: ${prompt}`;
    floatingQuery.style.display = "block";

    // Hide floating query when scrolling back to the first half of the page
    window.addEventListener("scroll", () => {
      if (window.scrollY < window.innerHeight / 2) {
        floatingQuery.style.display = "none";
      } else {
        floatingQuery.style.display = "block";
      }
    });
  } catch (error) {
    results.innerHTML = `<p>Error: ${error.message}</p>`;
  }
});

function formatResponse(content, generatedQuery) {
  // Remove any enclosing quotes from the generated query
  const cleanQuery = generatedQuery.replace(/^"|"$/g, '');

  // Split the content into paragraphs
  const paragraphs = content.split('\n').filter(p => p.trim() !== '');
  // Format each paragraph
  const formattedParagraphs = paragraphs.map(p => {
    // Check if the paragraph starts with a number followed by a period
    const match = p.match(/^(\d+)\.\s\*\*(.+?)\*\*:\s(.+)/);
    if (match) {
      return `<h2>${match[1]}. <strong>${match[2]}</strong>:</h2><p>${match[3]}</p>`;
    }
    // Check if the paragraph contains a hyphen
    if (p.includes('-')) {
      return `<li>${p}</li>`;
    }
    return `<p>${p}</p>`;
  }).join('');

  // Include the cleaned query at the start
  return `<h1 class="question">${cleanQuery}</h1><ul>${formattedParagraphs}</ul>`;
}

// Display file information
function displayFileInfo() {
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const file = fileInput.files[0];

  if (file) {
    fileInfo.innerHTML = `
      <p><strong>Name:</strong> ${file.name}</p>
      <p><strong>Type:</strong> ${file.type}</p>
      <p><strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
    `;
  } else {
    fileInfo.innerHTML = '';
  }
}

// Footer collapse/expand
function toggleFooter() {
  const footer = document.querySelector(".footer");
  footer.classList.toggle("collapsed");
  const footerToggle = document.querySelector(".footer-toggle");
  footerToggle.innerHTML = footer.classList.contains("collapsed") ? "⮟" : "⮟";
}

// Side menu collapse/expand
function toggleSideMenu() {
  const sideMenu = document.querySelector(".side-menu");
  sideMenu.classList.toggle("collapsed");
  document.querySelector(".wrapper").style.paddingLeft = sideMenu.classList.contains("collapsed") ? "60px" : "210px";
  const menuToggle = document.querySelector(".menu-toggle");
  menuToggle.innerHTML = sideMenu.classList.contains("collapsed") ? "⮞":"⮜" ;
}

// Theme switcher
function toggleTheme() {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle.checked) {
    root.classList.add('light-mode');
    root.classList.remove('dark-mode');
  } else {
    root.classList.add('dark-mode');
    root.classList.remove('light-mode');
  }
}

// Initialize theme based on user preference or default to dark mode
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  if (root.classList.contains('light-mode')) {
    themeToggle.checked = true;
  } else {
    themeToggle.checked = false;
  }
});
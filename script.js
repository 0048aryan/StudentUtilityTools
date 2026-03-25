(function () {
  const page = document.body.dataset.page;
  const conversionCategories = {
    Length: ["meter", "kilometer", "centimeter", "millimeter", "mile", "yard", "foot", "inch"],
    Weight: ["kilogram", "gram", "milligram", "pound", "ounce"],
    Area: ["square meter", "square kilometer", "square foot", "acre", "hectare"],
    Volume: ["liter", "milliliter", "cubic meter", "gallon", "cup"],
    Time: ["second", "minute", "hour", "day"],
    Temperature: ["Celsius", "Fahrenheit", "Kelvin"]
  };

  initNavigation();
  highlightActiveLink();
  initContactForm();
  initAttendanceCalculator();
  initCgpaCalculator();
  initPercentageCalculator();
  initConverter();
  initGrammarChecker();

  function initNavigation() {
    const header = document.querySelector(".site-header");
    const toggle = document.querySelector(".nav-toggle");

    if (!header || !toggle) {
      return;
    }

    toggle.addEventListener("click", function () {
      const open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  function highlightActiveLink() {
    const map = {
      home: "index.html",
      attendance: "attendance.html",
      cgpa: "cgpa.html",
      percentage: "percentage.html",
      converter: "converter.html",
      grammar: "grammar.html"
    };

    const active = map[page];
    if (!active) {
      return;
    }

    document.querySelectorAll(".site-nav a").forEach(function (link) {
      if (link.getAttribute("href") === active) {
        link.classList.add("active");
      }
    });
  }

  function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) {
      return;
    }

    const status = document.getElementById("contactStatus");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const payload = {
        name: document.getElementById("contactName").value.trim(),
        email: document.getElementById("contactEmail").value.trim(),
        message: document.getElementById("contactMessage").value.trim()
      };

      if (!payload.name || !payload.email || !payload.message) {
        setStatus(status, "Please complete all contact form fields.", true);
        return;
      }

      setStatus(status, "Sending your message...", false);

      try {
        const response = await postJson("/api/contact", payload);
        form.reset();
        setStatus(status, response.message + " Reference ID: " + response.ticketId + ".", false);
      } catch (error) {
        setStatus(status, error.message, true);
      }
    });
  }

  function initAttendanceCalculator() {
    const form = document.getElementById("attendanceForm");
    if (!form) {
      return;
    }

    const error = document.getElementById("attendanceError");
    const percentEl = document.getElementById("attendancePercent");
    const summaryEl = document.getElementById("attendanceSummary");
    const actionEl = document.getElementById("attendanceAction");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const payload = {
        totalClasses: Number(document.getElementById("totalClasses").value),
        attendedClasses: Number(document.getElementById("attendedClasses").value),
        targetAttendance: Number(document.getElementById("targetAttendance").value)
      };

      try {
        setStatus(error, "Calculating attendance...", false);
        const response = await postJson("/api/attendance", payload);
        setStatus(error, "", false);
        percentEl.textContent = formatNumber(response.currentAttendance) + "%";
        summaryEl.textContent = response.summary;
        actionEl.textContent = response.action;
      } catch (requestError) {
        setStatus(error, requestError.message, true);
      }
    });
  }

  function initCgpaCalculator() {
    const rowsContainer = document.getElementById("cgpaRows");
    const addButton = document.getElementById("addCgpaRow");
    const calculateButton = document.getElementById("calculateCgpa");

    if (!rowsContainer || !addButton || !calculateButton) {
      return;
    }

    const error = document.getElementById("cgpaError");
    const cgpaValue = document.getElementById("cgpaValue");
    const cgpaCredits = document.getElementById("cgpaCredits");
    const cgpaPoints = document.getElementById("cgpaPoints");

    for (let index = 0; index < 4; index += 1) {
      appendCgpaRow(rowsContainer);
    }

    addButton.addEventListener("click", function () {
      appendCgpaRow(rowsContainer);
    });

    rowsContainer.addEventListener("click", function (event) {
      if (event.target.classList.contains("remove-row")) {
        event.target.closest(".entry-row").remove();
      }
    });

    calculateButton.addEventListener("click", async function () {
      const subjects = Array.from(rowsContainer.querySelectorAll(".entry-row")).map(function (row) {
        return {
          name: row.querySelector(".subject-name").value.trim(),
          gradePoint: Number(row.querySelector(".grade-point").value),
          credit: Number(row.querySelector(".credit-point").value)
        };
      });

      try {
        setStatus(error, "Calculating CGPA...", false);
        const response = await postJson("/api/cgpa", { subjects: subjects });
        setStatus(error, "", false);
        cgpaValue.textContent = formatNumber(response.cgpa);
        cgpaCredits.textContent = formatNumber(response.totalCredits);
        cgpaPoints.textContent = formatNumber(response.totalPoints);
      } catch (requestError) {
        setStatus(error, requestError.message, true);
      }
    });
  }

  function appendCgpaRow(container) {
    const row = document.createElement("div");
    row.className = "entry-row";
    row.innerHTML =
      '<label>Subject<input type="text" class="subject-name" placeholder="e.g. Mathematics" /></label>' +
      '<label>Grade Point<input type="number" class="grade-point" min="0" max="10" step="0.01" placeholder="8.5" /></label>' +
      '<label>Credits<input type="number" class="credit-point" min="0.5" step="0.5" placeholder="4" /></label>' +
      '<button class="button secondary remove-row" type="button" aria-label="Remove subject">x</button>';
    container.appendChild(row);
  }

  function initPercentageCalculator() {
    const rowsContainer = document.getElementById("percentageRows");
    const addButton = document.getElementById("addPercentageRow");
    const calculateButton = document.getElementById("calculatePercentage");

    if (!rowsContainer || !addButton || !calculateButton) {
      return;
    }

    const error = document.getElementById("percentageError");
    const obtainedMarks = document.getElementById("obtainedMarks");
    const maximumMarks = document.getElementById("maximumMarks");
    const percentageValue = document.getElementById("percentageValue");

    for (let index = 0; index < 4; index += 1) {
      appendPercentageRow(rowsContainer);
    }

    addButton.addEventListener("click", function () {
      appendPercentageRow(rowsContainer);
    });

    rowsContainer.addEventListener("click", function (event) {
      if (event.target.classList.contains("remove-row")) {
        event.target.closest(".entry-row").remove();
      }
    });

    calculateButton.addEventListener("click", async function () {
      const subjects = Array.from(rowsContainer.querySelectorAll(".entry-row")).map(function (row) {
        return {
          name: row.querySelector(".subject-name").value.trim(),
          obtained: Number(row.querySelector(".obtained-mark").value),
          maximum: Number(row.querySelector(".maximum-mark").value)
        };
      });

      try {
        setStatus(error, "Calculating percentage...", false);
        const response = await postJson("/api/percentage", { subjects: subjects });
        setStatus(error, "", false);
        obtainedMarks.textContent = formatNumber(response.obtainedMarks);
        maximumMarks.textContent = formatNumber(response.maximumMarks);
        percentageValue.textContent = formatNumber(response.percentage) + "%";
      } catch (requestError) {
        setStatus(error, requestError.message, true);
      }
    });
  }

  function appendPercentageRow(container) {
    const row = document.createElement("div");
    row.className = "entry-row";
    row.innerHTML =
      '<label>Subject<input type="text" class="subject-name" placeholder="e.g. Physics" /></label>' +
      '<label>Obtained<input type="number" class="obtained-mark" min="0" step="0.01" placeholder="82" /></label>' +
      '<label>Maximum<input type="number" class="maximum-mark" min="1" step="0.01" placeholder="100" /></label>' +
      '<button class="button secondary remove-row" type="button" aria-label="Remove subject">x</button>';
    container.appendChild(row);
  }

  function initConverter() {
    const form = document.getElementById("converterForm");
    if (!form) {
      return;
    }

    const categorySelect = document.getElementById("conversionCategory");
    const fromSelect = document.getElementById("fromUnit");
    const toSelect = document.getElementById("toUnit");
    const valueInput = document.getElementById("conversionValue");
    const error = document.getElementById("converterError");
    const result = document.getElementById("converterResult");
    const formula = document.getElementById("converterFormula");

    Object.keys(conversionCategories).forEach(function (category) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });

    categorySelect.addEventListener("change", function () {
      populateUnitSelects(categorySelect.value, fromSelect, toSelect);
      runConversion();
    });

    fromSelect.addEventListener("change", runConversion);
    toSelect.addEventListener("change", runConversion);
    valueInput.addEventListener("input", runConversion);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      runConversion();
    });

    populateUnitSelects(categorySelect.value, fromSelect, toSelect);
    runConversion();

    async function runConversion() {
      const payload = {
        category: categorySelect.value,
        value: Number(valueInput.value),
        fromUnit: fromSelect.value,
        toUnit: toSelect.value
      };

      try {
        setStatus(error, "Converting...", false);
        const response = await postJson("/api/convert", payload);
        setStatus(error, "", false);
        result.textContent = formatNumber(response.convertedValue) + " " + payload.toUnit;
        formula.textContent = response.note;
      } catch (requestError) {
        setStatus(error, requestError.message, true);
      }
    }
  }

  function populateUnitSelects(categoryName, fromSelect, toSelect) {
    const units = conversionCategories[categoryName] || conversionCategories[Object.keys(conversionCategories)[0]];
    fromSelect.innerHTML = "";
    toSelect.innerHTML = "";

    units.forEach(function (unit, index) {
      const fromOption = document.createElement("option");
      fromOption.value = unit;
      fromOption.textContent = unit;
      fromSelect.appendChild(fromOption);

      const toOption = document.createElement("option");
      toOption.value = unit;
      toOption.textContent = unit;
      toSelect.appendChild(toOption);

      if (index === 0) {
        fromOption.selected = true;
      }

      if (index === Math.min(1, units.length - 1)) {
        toOption.selected = true;
      }
    });
  }

  function initGrammarChecker() {
    const button = document.getElementById("checkGrammar");
    if (!button) {
      return;
    }

    const input = document.getElementById("grammarInput");
    const error = document.getElementById("grammarError");
    const issueCount = document.getElementById("grammarIssueCount");
    const suggestions = document.getElementById("grammarSuggestions");
    const corrected = document.getElementById("grammarCorrected");

    button.addEventListener("click", async function () {
      const text = input.value.trim();

      try {
        setStatus(error, "Checking grammar...", false);
        const response = await postJson("/api/grammar", { text: text });
        setStatus(error, "", false);
        issueCount.textContent = String(response.issueCount);
        suggestions.textContent = response.suggestions.length
          ? response.suggestions.join(" ")
          : "No common grammar issues were detected in this text.";
        corrected.textContent = response.corrected;
      } catch (requestError) {
        setStatus(error, requestError.message, true);
      }
    });
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(function () {
      return { error: "Unexpected server response." };
    });

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  function setStatus(element, message, isError) {
    if (!element) {
      return;
    }

    element.textContent = message;
    element.classList.toggle("error", Boolean(message) && isError);
    element.classList.toggle("success", Boolean(message) && !isError);
  }

  function formatNumber(value) {
    return Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2
    });
  }
})();

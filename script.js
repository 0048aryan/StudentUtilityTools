(function () {
  const page = document.body.dataset.page;

  initNavigation();
  highlightActiveLink();
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

  function initAttendanceCalculator() {
    const form = document.getElementById("attendanceForm");
    if (!form) {
      return;
    }

    const error = document.getElementById("attendanceError");
    const percentEl = document.getElementById("attendancePercent");
    const summaryEl = document.getElementById("attendanceSummary");
    const actionEl = document.getElementById("attendanceAction");

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const total = Number(document.getElementById("totalClasses").value);
      const attended = Number(document.getElementById("attendedClasses").value);
      const target = Number(document.getElementById("targetAttendance").value);

      if (!Number.isFinite(total) || !Number.isFinite(attended) || !Number.isFinite(target)) {
        setStatus(error, "Please enter valid numeric values.", true);
        return;
      }

      if (total <= 0 || attended < 0 || attended > total || target <= 0 || target > 100) {
        setStatus(error, "Classes and target values must be within a valid range.", true);
        return;
      }

      setStatus(error, "", false);

      const current = (attended / total) * 100;
      percentEl.textContent = formatNumber(current) + "%";

      if (current >= target) {
        summaryEl.textContent = "You are meeting your target attendance.";
        const safeLeaves = target === 100 ? 0 : Math.floor((100 * attended) / target - total);
        actionEl.textContent =
          safeLeaves > 0
            ? "You can miss " + safeLeaves + " more class" + pluralize(safeLeaves) + " and still stay above " + formatNumber(target) + "%."
            : "You should avoid missing any upcoming classes if you want to stay at or above " + formatNumber(target) + "%.";
        return;
      }

      summaryEl.textContent = "You are currently below your target attendance.";

      if (target === 100) {
        actionEl.textContent =
          attended === total
            ? "You must attend every upcoming class to maintain 100% attendance."
            : "Reaching 100% is no longer possible because at least one class has already been missed.";
        return;
      }

      const classesNeeded = Math.ceil((target * total - 100 * attended) / (100 - target));
      actionEl.textContent =
        "Attend the next " +
        classesNeeded +
        " class" +
        pluralize(classesNeeded) +
        " without missing any to reach " +
        formatNumber(target) +
        "%.";
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

    calculateButton.addEventListener("click", function () {
      const rows = Array.from(rowsContainer.querySelectorAll(".entry-row"));
      let totalCredits = 0;
      let totalPoints = 0;

      if (rows.length === 0) {
        setStatus(error, "Add at least one subject before calculating CGPA.", true);
        return;
      }

      for (const row of rows) {
        const subject = row.querySelector(".subject-name").value.trim();
        const gradePoint = Number(row.querySelector(".grade-point").value);
        const credit = Number(row.querySelector(".credit-point").value);

        if (!subject) {
          setStatus(error, "Each CGPA row needs a subject name.", true);
          return;
        }

        if (!Number.isFinite(gradePoint) || gradePoint < 0 || gradePoint > 10) {
          setStatus(error, "Grade points must be between 0 and 10.", true);
          return;
        }

        if (!Number.isFinite(credit) || credit <= 0) {
          setStatus(error, "Credits must be greater than zero.", true);
          return;
        }

        totalCredits += credit;
        totalPoints += gradePoint * credit;
      }

      setStatus(error, "", false);
      cgpaValue.textContent = formatNumber(totalPoints / totalCredits);
      cgpaCredits.textContent = formatNumber(totalCredits);
      cgpaPoints.textContent = formatNumber(totalPoints);
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

    calculateButton.addEventListener("click", function () {
      const rows = Array.from(rowsContainer.querySelectorAll(".entry-row"));
      let totalObtained = 0;
      let totalMaximum = 0;

      if (rows.length === 0) {
        setStatus(error, "Add at least one subject before calculating percentage.", true);
        return;
      }

      for (const row of rows) {
        const subject = row.querySelector(".subject-name").value.trim();
        const obtained = Number(row.querySelector(".obtained-mark").value);
        const maximum = Number(row.querySelector(".maximum-mark").value);

        if (!subject) {
          setStatus(error, "Each percentage row needs a subject name.", true);
          return;
        }

        if (!Number.isFinite(obtained) || obtained < 0) {
          setStatus(error, "Obtained marks must be zero or more.", true);
          return;
        }

        if (!Number.isFinite(maximum) || maximum <= 0) {
          setStatus(error, "Maximum marks must be greater than zero.", true);
          return;
        }

        if (obtained > maximum) {
          setStatus(error, "Obtained marks cannot be greater than maximum marks.", true);
          return;
        }

        totalObtained += obtained;
        totalMaximum += maximum;
      }

      setStatus(error, "", false);
      obtainedMarks.textContent = formatNumber(totalObtained);
      maximumMarks.textContent = formatNumber(totalMaximum);
      percentageValue.textContent = formatNumber((totalObtained / totalMaximum) * 100) + "%";
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

    const categories = {
      Length: {
        type: "factor",
        units: {
          meter: 1,
          kilometer: 1000,
          centimeter: 0.01,
          millimeter: 0.001,
          mile: 1609.344,
          yard: 0.9144,
          foot: 0.3048,
          inch: 0.0254
        }
      },
      Weight: {
        type: "factor",
        units: {
          kilogram: 1,
          gram: 0.001,
          milligram: 0.000001,
          pound: 0.45359237,
          ounce: 0.028349523125
        }
      },
      Area: {
        type: "factor",
        units: {
          "square meter": 1,
          "square kilometer": 1000000,
          "square foot": 0.09290304,
          acre: 4046.8564224,
          hectare: 10000
        }
      },
      Volume: {
        type: "factor",
        units: {
          liter: 1,
          milliliter: 0.001,
          "cubic meter": 1000,
          gallon: 3.785411784,
          cup: 0.2365882365
        }
      },
      Time: {
        type: "factor",
        units: {
          second: 1,
          minute: 60,
          hour: 3600,
          day: 86400
        }
      },
      Temperature: {
        type: "temperature",
        units: {
          Celsius: "C",
          Fahrenheit: "F",
          Kelvin: "K"
        }
      }
    };

    Object.keys(categories).forEach(function (category) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });

    categorySelect.addEventListener("change", function () {
      populateUnitSelects(categories, categorySelect.value, fromSelect, toSelect);
      runConversion();
    });

    fromSelect.addEventListener("change", runConversion);
    toSelect.addEventListener("change", runConversion);
    valueInput.addEventListener("input", runConversion);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      runConversion();
    });

    populateUnitSelects(categories, categorySelect.value, fromSelect, toSelect);
    runConversion();

    function runConversion() {
      const category = categories[categorySelect.value];
      const value = Number(valueInput.value);
      if (!category || !Number.isFinite(value)) {
        setStatus(error, "Please enter a valid number to convert.", true);
        return;
      }

      setStatus(error, "", false);
      const from = fromSelect.value;
      const to = toSelect.value;
      let converted = 0;
      let note = "";

      if (category.type === "factor") {
        converted = (value * category.units[from]) / category.units[to];
        note = "Converted via a shared base unit for " + categorySelect.value.toLowerCase() + ".";
      } else {
        converted = convertTemperature(value, from, to);
        note = "Temperature conversion uses direct Celsius, Fahrenheit, and Kelvin formulas.";
      }

      result.textContent = formatNumber(converted) + " " + to;
      formula.textContent = note;
    }
  }

  function populateUnitSelects(categories, categoryName, fromSelect, toSelect) {
    const category = categories[categoryName] || categories[Object.keys(categories)[0]];
    const units = Object.keys(category.units);
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

  function convertTemperature(value, from, to) {
    let celsius;

    if (from === "Celsius") {
      celsius = value;
    } else if (from === "Fahrenheit") {
      celsius = ((value - 32) * 5) / 9;
    } else {
      celsius = value - 273.15;
    }

    if (to === "Celsius") {
      return celsius;
    }

    if (to === "Fahrenheit") {
      return (celsius * 9) / 5 + 32;
    }

    return celsius + 273.15;
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

    button.addEventListener("click", function () {
      const text = input.value.trim();
      if (!text) {
        setStatus(error, "Enter some text to run the grammar checker.", true);
        return;
      }

      setStatus(error, "", false);
      const review = analyzeGrammar(text);
      issueCount.textContent = String(review.issues.length);
      suggestions.textContent = review.issues.length
        ? review.issues.join(" ")
        : "No common grammar issues were detected in this text.";
      corrected.textContent = review.corrected;
    });
  }

  function analyzeGrammar(text) {
    const issues = [];
    let corrected = text;

    const directReplacements = [
      ["alot", "a lot"],
      ["definately", "definitely"],
      ["recieve", "receive"],
      ["seperate", "separate"],
      ["occured", "occurred"],
      ["grammer", "grammar"],
      ["attendence", "attendance"],
      ["dont", "don't"],
      ["cant", "can't"],
      ["wont", "won't"],
      ["im", "I'm"],
      ["ive", "I've"],
      ["didnt", "didn't"],
      ["isnt", "isn't"],
      ["arent", "aren't"]
    ];

    directReplacements.forEach(function (pair) {
      const original = pair[0];
      const replacement = pair[1];
      const pattern = new RegExp("\\b" + original + "\\b", "gi");

      if (pattern.test(corrected)) {
        corrected = corrected.replace(pattern, replacement);
        issues.push('Replaced "' + original + '" with "' + replacement + '".');
      }
    });

    if (/\b(\w+)\s+\1\b/i.test(corrected)) {
      corrected = corrected.replace(/\b(\w+)\s+\1\b/gi, "$1");
      issues.push("Removed repeated consecutive words.");
    }

    if (/\bi\b/.test(corrected)) {
      corrected = corrected.replace(/\bi\b/g, "I");
      issues.push('Capitalized the pronoun "I".');
    }

    if (/\s+([,.;!?])/g.test(corrected)) {
      corrected = corrected.replace(/\s+([,.;!?])/g, "$1");
      issues.push("Removed extra spaces before punctuation.");
    }

    if (/ {2,}/.test(corrected)) {
      corrected = corrected.replace(/ {2,}/g, " ");
      issues.push("Collapsed multiple spaces into single spaces.");
    }

    corrected = corrected
      .split(/([.!?]\s*)/)
      .reduce(function (sentences, part, index, parts) {
        if (index % 2 === 0) {
          const punctuation = parts[index + 1] || "";
          const combined = (part + punctuation).trim();
          if (combined) {
            sentences.push(combined);
          }
        }
        return sentences;
      }, [])
      .map(function (sentence) {
        return sentence.charAt(0).toUpperCase() + sentence.slice(1);
      })
      .join(" ");

    if (corrected && text.charAt(0) === text.charAt(0).toLowerCase()) {
      issues.push("Capitalized sentence beginnings.");
    }

    corrected = corrected.replace(/\b([Aa])\s+([aeiouAEIOU]\w*)/g, function (_, article, word) {
      issues.push('Adjusted "a" to "an" before a vowel sound.');
      return article === "A" ? "An " + word : "an " + word;
    });

    corrected = corrected.replace(/\b([Aa])n\s+([^aeiouAEIOU\s]\w*)/g, function (_, article, word) {
      issues.push('Adjusted "an" to "a" before a consonant sound.');
      return article === "A" ? "A " + word : "a " + word;
    });

    if (!/[.!?]$/.test(corrected)) {
      corrected += ".";
      issues.push("Added ending punctuation.");
    }

    corrected = corrected.replace(/\s+/g, " ").trim();

    return {
      issues: Array.from(new Set(issues)),
      corrected: corrected
    };
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

  function pluralize(count) {
    return count === 1 ? "" : "es";
  }
})();

const themeSelect = document.getElementById("theme-select");
const taskList = document.getElementById("task-list");
const newItemInput = document.getElementById("new-task-input");
const addBtn = document.getElementById("add-btn");

const showAllBtn = document.getElementById("show-all-tasks");
const activeBtn = document.getElementById("task-status-active");
const completedBtn = document.getElementById("completed");

const clearCompletedBtn = document.getElementById("clear-completed");
const clearAllBtn = document.getElementById("clear-all");
const remainingTasks = document.getElementById("remaining-tasks");
const filters = document.querySelectorAll(".filter");

const emptyImage = document.querySelector(".empty-image");

let currentFilter = "all";

// Theme change
const themes = ["default", "dark", "colored"];
const themeKey = "theme";

themeSelect.addEventListener("change", (event) => {
  const selectedTheme = event.target.value;
  document.body.classList.remove(...themes);
  document.body.classList.add(selectedTheme);
  // Save theme to local storage
  localStorage.setItem('themeKey', selectedTheme);
});

// Display or hide empty list image
const toggleEmptyState = () => {
  const items = taskList.querySelectorAll(".item");
  let visibleItem = 0;
  items.forEach((li) => {
    if (li.style.display !== "none") visibleItem++;
  });
  emptyImage.style.display = visibleItem === 0 ? "block" : "none";
};

// Add a task
addBtn.addEventListener("click", addNewItem);
newItemInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addNewItem();
});

function addNewItem(save = true) {
  const value = newItemInput.value.trim();

  if (value !== "") {

  const newLi = document.createElement("li");
  newLi.classList.add("item");

  newLi.innerHTML = `
    <input class="checkbox" type="checkbox" aria-label="checkbox">
    <span class="task-text"></span>
    <div class="icons">
      <img class="edit-task" src="edit_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" alt="Edit">
      <img class="delete-task" src="delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" alt="Delete">
    </div>
  `;

  newLi.querySelector(".task-text").textContent = value;

  taskList.appendChild(newLi);
  newItemInput.value = "";

  applyFilter();
  updateRemainingTasks();
  displayClearCompletedBtn();
  toggleEmptyState();

  if (save) {
    saveTaskToLocalStorage();
  }

  } else {
    alert("Enter a task (field cannot be empty)");
    return;
  }
}

// Event listener on taskList to update and delete items
taskList.addEventListener("click", (event) => {
  const li = event.target.closest(".item");
  if (!li) return;

  // Delete a task using the icon
  if (event.target.classList.contains("delete-task")) {

    if (confirm("Are you sure you want to delete this item FOREVER???")) {
      li.remove();
    updateRemainingTasks();
    displayClearCompletedBtn();
    toggleEmptyState();
    saveTaskToLocalStorage()
    return;
    } else {
      return;
    }
    
  }

  // Modify a task using the icon
  if (event.target.classList.contains("edit-task")) {
    const currentTask = li.querySelector(".task-text");
    const oldText = currentTask.textContent;
    const input = document.createElement("input");
    input.type = "text";
    input.value = oldText;
    input.className = "edit-input";

    currentTask.replaceWith(input);
    input.focus();

    const saveEdit = () =>  {
      const newText = input.value.trim();

      if (newText !== "") {
        const newSpan = document.createElement("span");
        newSpan.className = "task-text";
        newSpan.textContent = newText;
        input.replaceWith(newSpan);
      } else {
        input.replaceWith(currentTask);
      }
      saveTaskToLocalStorage()
    };

    input.addEventListener("blur", saveEdit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        saveEdit();
      }
    })
  }
});

// Filters
showAllBtn.addEventListener("click", () => {
  currentFilter = "all";
  setActiveFilter(showAllBtn);
  applyFilter();
  toggleEmptyState();
});

activeBtn.addEventListener("click", () => {
  currentFilter = "active";
  setActiveFilter(activeBtn);
  applyFilter();
  toggleEmptyState();
});

completedBtn.addEventListener("click", () => {
  currentFilter = "completed";
  setActiveFilter(completedBtn);
  applyFilter();
  toggleEmptyState();
});

function applyFilter() {
  const items = taskList.querySelectorAll(".item");

  items.forEach((li) => {
    const checkbox = li.querySelector(".checkbox");
    const isCompleted = checkbox.checked;

    if (currentFilter === "active") {
      li.style.display = isCompleted ? "none" : "flex";
    } else if (currentFilter === "completed") {
      li.style.display = isCompleted ? "flex" : "none";
    } else {
      li.style.display = "flex";
    }
  });
  displayClearCompletedBtn();
  toggleEmptyState();
}

function setActiveFilter(activeElement) {
  filters.forEach((filter) => filter.classList.remove("active"));
  activeElement.classList.add("active");
}

// Complete tasks and clear completed tasks
taskList.addEventListener("change", (event) => {
  if (!event.target.classList.contains("checkbox")) return;

  const li = event.target.closest(".item");
  const currentTask = li.querySelector(".task-text");

  currentTask.classList.toggle("crossed");

  updateRemainingTasks();
  applyFilter(); 
  displayClearCompletedBtn();
  updateProgress();
  saveTaskToLocalStorage()
});

function displayClearCompletedBtn() {
  const items = taskList.querySelectorAll(".item");
  let isComplete = false;

  for (const li of items) {
    if (li.querySelector(".checkbox").checked)
      isComplete = true;
  }

  clearCompletedBtn.style.display = isComplete ? "flex" : "none";
  toggleEmptyState();
}

clearCompletedBtn.addEventListener("click", () => {
  const items = taskList.querySelectorAll(".item");
  items.forEach((li) => {
    const checkbox = li.querySelector(".checkbox");
    if (checkbox.checked) li.remove();
  });

  updateRemainingTasks();
  applyFilter();
  displayClearCompletedBtn();
  toggleEmptyState();
  saveTaskToLocalStorage()
});

// Update remaining active tasks
function updateRemainingTasks() {
  const items = taskList.querySelectorAll(".item");
  let activeCount = 0;

  console.log(items);

  items.forEach((li) => {
    const checkbox = li.querySelector(".checkbox");
    if (!checkbox.checked) activeCount++;
  });
  // display
  remainingTasks.innerHTML =
    activeCount <= 1 
    ? `<span class="remaining-count">${activeCount}</span> task left`: `<span class="remaining-count">${activeCount}</span> tasks left`;
}

// Update progress
const updateProgress = (checkCompletion = true) => {
  const totalTasks = taskList.children.length;
  const completedTasksCount = Array.from(taskList.querySelectorAll(".checkbox"))
    .filter(cb => cb.checked).length;

  if (totalTasks > 0 && completedTasksCount === totalTasks) {
    Confetti();
  }
}

const Confetti = () => {
  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }
  confetti({
    angle: randomInRange(55, 125),
    spread: randomInRange(50, 70),
    particleCount: randomInRange(50, 100),
    origin: { y: .6 }
  });
};

// Local Storage
const saveTaskToLocalStorage = () => {
  const tasks = Array.from(taskList.querySelectorAll("li")).map(li => ({
    text: li.querySelector('span').textContent,
    completed: li.querySelector(".checkbox").checked
  }));
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

const loadTaskFromLocalStorage = () => {
  const savedTasks = JSON.parse(localStorage.getItem('tasks')) || [];

  console.log(savedTasks);

  savedTasks.forEach(({ text, completed }) => {
    newItemInput.value = text;
    addNewItem(false); 

    const lastLi = taskList.querySelector('li:last-child');

    const isEmpty = lastLi.querySelector('.task-text').textContent;

    console.log("isEmpty", isEmpty);
    console.log("name", text);

    if (isEmpty !== text) {
      console.log("HERE")
      return;
    }

    if (completed) {
      const checkbox = lastLi.querySelector('.checkbox');
      checkbox.checked = true;
      lastLi.querySelector('.task-text').classList.add('crossed');
    }
  });
};

clearAllBtn.addEventListener("click", clearAll);
function clearAll () {
  if (confirm("This will delete all tasks PERMANENTLY, please confirm")) {
    const tasks = taskList.querySelectorAll("li");
    tasks.forEach(li => li.remove());
    // Remove local storage
    localStorage.removeItem("tasks");
  } else {
    return;
  };

  init();
  }

function init() {
  loadTaskFromLocalStorage();
  setActiveFilter(showAllBtn);
  updateRemainingTasks();
  displayClearCompletedBtn();
  toggleEmptyState();
 
  // Apply last theme applied
  const savedTheme = localStorage.getItem('themeKey');
  const themeToApply = themes.includes(savedTheme) ? savedTheme : "default";
  document.body.classList.remove(...themes);
  document.body.classList.add(themeToApply);
  themeSelect.value= themeToApply;
}

init();



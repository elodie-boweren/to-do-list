const themeSelect = document.getElementById("theme-select");
const taskList = document.getElementById("task-list");
const newItemInput = document.getElementById("new-task-input");
const addBtn = document.getElementById("add-btn");
const PriorityOption = document.getElementById("priority-button");

const showAllBtn = document.getElementById("show-all-tasks");
const activeBtn = document.getElementById("task-status-active");
const completedBtn = document.getElementById("completed");

const clearCompletedBtn = document.getElementById("clear-completed");
const clearAllBtn = document.getElementById("clear-all");
const remainingTasks = document.getElementById("remaining-tasks");
const filters = document.querySelectorAll(".filter");

const emptyImage = document.querySelector(".empty-image");

let currentFilter = "all";

// Point out old tasks (over 7 days)
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; 

function formatTaskDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-UK', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function isOlderThan7Days(timestamp) {
  return Date.now() - Number(timestamp) >= SEVEN_DAYS;
}

function applyTaskAgeStyle(li, createdAt) {
  li.classList.toggle("item-old", isOlderThan7Days(createdAt));
}

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

async function addNewItem(save = true, taskData = null) {
  const value = taskData?.text ?? newItemInput.value.trim();

  if (value !== "") {
    const createdAt = taskData?.createdAt ?? Date.now();
    const completed = taskData?.completed ?? false;
    const priority = taskData?.priority ?? false;
    const id = taskData?.id ?? null;
  
    const newLi = document.createElement("li");
    newLi.classList.add("item");
    newLi.setAttribute("draggable", "true");
    newLi.dataset.createdAt = createdAt;
    newLi.dataset.id = id;

    newLi.innerHTML = `
  <input class="checkbox" type="checkbox" aria-label="checkbox" ${completed ? "checked" : ""}>

  <div class="task-main">
    <span class="task-text"></span>
    <small class="task-date">Added on ${formatTaskDate(createdAt)}</small>
  </div>

  <div class="icons">
    <button class="priority-button"></button>
    <img class="edit-task" src="edit_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" alt="Edit">
    <img class="delete-task" src="delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg" alt="Delete">
  </div>
`;

    newLi.querySelector(".task-text").textContent = value;

    if (save) {
      const res = await fetch('http://localhost:3000/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: value,
          createdAt: createdAt,
          completed: completed,
          priority: priority
        })
      });
      const createdTask = await res.json();
      newLi.dataset.id = createdTask.id;
      }

    if (completed) {
      newLi.querySelector(".task-text").classList.add("crossed");
    }
  
    if (priority) {
      newLi.classList.add("item-priority");
      const priorityBtn = newLi.querySelector(".priority-button");
      if (priorityBtn) {
        priorityBtn.classList.add("priority-btn-on");
      }
    }

    applyTaskAgeStyle(newLi, createdAt);
  
    taskList.appendChild(newLi);
  
    if (!taskData) newItemInput.value = "";
  
    applyFilter();
    updateRemainingTasks();
    displayClearCompletedBtn();
    toggleEmptyState();

    } else {
      if (!taskData) alert("Enter a task (field cannot be empty)");
      return;
    }
};

// Drag and drop items
taskList.addEventListener("dragstart", (event) => {
  let selected = event.target.closest(".item");
  const id = selected.dataset.id;
  if (!selected) return;
  
  taskList.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  taskList.addEventListener("drop", (event) => {
    taskList.prepend(selected);
    selected = null;
    updateTask(id, {});
  });
});

// Event listener on taskList to manage events
taskList.addEventListener("click", async (event) => {
  const li = event.target.closest(".item");
  // Get ID by element <li>
  const id = li?.dataset.id;

  // Delete a task using the icon
  if (event.target.classList.contains("delete-task")) {

    if (confirm("Delete this item FOREVER???")) {
      deleteTask(id);
      updateRemainingTasks();
      displayClearCompletedBtn();
      toggleEmptyState();
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

    const saveEdit = async () =>  {
      const newText = input.value.trim();

      if (newText !== "") {
        const newSpan = document.createElement("span");
        newSpan.className = "task-text";
        newSpan.textContent = newText;
        input.replaceWith(newSpan);
        const updated = await updateTask(id, { text: newText });
      } else {
        input.replaceWith(currentTask);
      }
    };

    input.addEventListener("blur", saveEdit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        saveEdit();
      }
    })
  }

  // Change colour of task to prioritize
  if (event.target.classList.contains("priority-button")) {
    li.classList.toggle("item-priority");
    event.target.classList.toggle("priority-btn-on");
    const isPriority = li.classList.contains("item-priority");
    await updateTask(id, { priority: isPriority });
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

// Cross completed tasks
taskList.addEventListener("change", async (event) => {
  if (!event.target.classList.contains("checkbox")) return;

  const li = event.target.closest(".item");
  const id = li.dataset.id;
  const currentTask = li.querySelector(".task-text");
  const isCompleted = event.target.checked;

  currentTask.classList.toggle("crossed", isCompleted);

  await updateTask(id, {completed: isCompleted});

  updateRemainingTasks();
  applyFilter(); 
  displayClearCompletedBtn();
  updateProgress();
});

// Clear completed tasks
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
  const completedItems = Array.from(taskList.querySelectorAll(".item")).filter(li => {
    const checkbox = li.querySelector(".checkbox");
    return checkbox.checked;
  }); 
  
  const deletePromises = completedItems.map(li => {
    const id = li.dataset.id;
    return deleteTask(id).then(() => {
      li.remove();
    });
  });

  Promise.all(deletePromises)
  .catch((error) => {
    console.error("Error while deleting tasks : ", error);
  });

  updateRemainingTasks();
  applyFilter();
  displayClearCompletedBtn();
  toggleEmptyState();
});

// Update remaining active tasks
function updateRemainingTasks() {
  const items = taskList.querySelectorAll(".item");
  let activeCount = 0;

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

const loadTaskFromServer = async () => {
  taskList.innerHTML = "";
  let uri = 'http://localhost:3000/tasks?_sort=createdAt';
  const res = await fetch(uri);
  const tasks = await res.json();
  tasks.forEach(task => {
    addNewItem(false, {
      text: task.text,
      completed: task.completed,
      createdAt: task.createdAt,
      priority: task.priority,
      id: task.id
    });
  });
}

async function updateTask(id, patch) {
  const res = await fetch(`http://localhost:3000/tasks/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(patch)
  });

  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}`);
  }

  return await res.json();
}

async function deleteTask(id) {
  const res = await fetch(`http://localhost:3000/tasks/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}`);
  }

  return await res.json();
}

// Clear all tasks
clearAllBtn.addEventListener("click", clearAll);
async function clearAll () {
  if (confirm("This will delete all tasks PERMANENTLY, please confirm")) {
    const items = Array.from(taskList.querySelectorAll(".item"));
    
    const deletePromises = items.map(async li => {
      const id = li.dataset.id;
      return deleteTask(id).then(() => {
        li.remove();
      });
    });
  
    Promise.all(deletePromises)
    .catch((error) => {
      console.error("Error while deleting tasks : ", error);
    });
  } else {
    return;
  };
  }

function init() {
  loadTaskFromServer();
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

  // bonus: to check for old tasks regularly
  setInterval(() => {
    taskList.querySelectorAll(".item").forEach(li => {
      applyTaskAgeStyle(li, li.dataset.createdAt);
    });
  }, 60 * 1000);
}

init();

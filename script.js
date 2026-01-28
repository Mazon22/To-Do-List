document.addEventListener("DOMContentLoaded", () => {
  const newTaskInput = document.getElementById("new-task-input");
  const addTaskBtn = document.getElementById("add-task-btn");
  const taskList = document.getElementById("task-list");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const totalTasksSpan = document.getElementById("total-tasks");
  const completedTasksSpan = document.getElementById("completed-tasks");

  let tasks = [];
  let currentFilter = "all";
  let db;

  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("TodoAppDB", 1);

      request.onerror = () => {
        console.error("Database error:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        loadTasksFromDB().then(resolve).catch(reject);
      };

      request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains("tasks")) {
          const objectStore = db.createObjectStore("tasks", { keyPath: "id" });
          objectStore.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
    });
  }

  function loadTasksFromDB() {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["tasks"], "readonly");
      const objectStore = transaction.objectStore("tasks");
      const request = objectStore.getAll();

      request.onsuccess = () => {
        tasks = request.result;
        renderTasks();
        resolve();
      };

      request.onerror = () => {
        console.error("Error loading tasks:", request.error);
        reject(request.error);
      };
    });
  }

  function saveTaskToDB(task) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["tasks"], "readwrite");
      const objectStore = transaction.objectStore("tasks");
      const request = objectStore.put(task);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error("Error saving task:", request.error);
        reject(request.error);
      };
    });
  }

  function deleteTaskFromDB(id) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["tasks"], "readwrite");
      const objectStore = transaction.objectStore("tasks");
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error("Error deleting task:", request.error);
        reject(request.error);
      };
    });
  }

  function clearAllTasksFromDB() {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["tasks"], "readwrite");
      const objectStore = transaction.objectStore("tasks");
      const request = objectStore.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error("Error clearing tasks:", request.error);
        reject(request.error);
      };
    });
  }

  function renderTasks() {
    taskList.innerHTML = "";

    const filteredTasks = tasks.filter((task) => {
      if (currentFilter === "active") return !task.completed;
      if (currentFilter === "completed") return task.completed;
      return true;
    });

    filteredTasks.forEach((task, index) => {
      const li = document.createElement("li");
      li.className = `task-item ${task.completed ? "completed" : ""}`;

      li.innerHTML = `
        <div class="task-content">
          <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""} data-id="${task.id}">
          <span class="task-text">${task.text}</span>
        </div>
        <button class="delete-btn" data-id="${task.id}">Удалить</button>
      `;

      taskList.appendChild(li);
    });

    updateStats();
  }

  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;

    totalTasksSpan.textContent = `Всего: ${total} ${total === 1 ? "задача" : total < 5 ? "задачи" : "задач"}`;
    completedTasksSpan.textContent = `Завершено: ${completed}`;
  }

  function addTask() {
    const text = newTaskInput.value.trim();

    if (text) {
      const newTask = {
        id: Date.now(),
        text,
        completed: false,
        createdAt: new Date(),
      };

      tasks.push(newTask);
      saveTaskToDB(newTask)
        .then(() => {
          renderTasks();

          newTaskInput.value = "";
          newTaskInput.focus();
        })
        .catch((error) => {
          console.error("Failed to save task:", error);
        });
    }
  }

  function toggleTask(id) {
    const taskIndex = tasks.findIndex((task) => task.id == id);
    if (taskIndex !== -1) {
      tasks[taskIndex].completed = !tasks[taskIndex].completed;

      saveTaskToDB(tasks[taskIndex])
        .then(() => renderTasks())
        .catch((error) => {
          console.error("Failed to update task:", error);
        });
    }
  }

  function deleteTask(id) {
    tasks = tasks.filter((task) => task.id != id);

    deleteTaskFromDB(id)
      .then(() => renderTasks())
      .catch((error) => {
        console.error("Failed to delete task:", error);
      });
  }

  function setFilter(filter) {
    currentFilter = filter;

    filterBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === filter);
    });

    renderTasks();
  }

  initDB().catch((error) => {
    console.error("Failed to initialize database:", error);
    tasks = [];
    renderTasks();
  });

  addTaskBtn.addEventListener("click", addTask);

  newTaskInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addTask();
    }
  });

  taskList.addEventListener("click", (e) => {
    if (e.target.classList.contains("task-checkbox")) {
      const taskId = e.target.dataset.id;
      toggleTask(taskId);
    } else if (e.target.classList.contains("delete-btn")) {
      const taskId = e.target.dataset.id;
      deleteTask(taskId);
    }
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      setFilter(btn.dataset.filter);
    });
  });
});

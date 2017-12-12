"use strict"
var workLength = 1500;
var shortBreakLength = 300;
var longBreakLength = 600;
var timerInterval;
var timerCallback = null;
var paused = false;
var notificationPermission;
var tasks;
var emptyTask = {name : '', description: 'No task', color: '#FFFFFF'};
var currentTask = emptyTask;
var calendar;
var currentDay;
var weekOffset = 0;
var weekday = new Array(7);
weekday[0] =  "Sunday";
weekday[1] = "Monday";
weekday[2] = "Tuesday";
weekday[3] = "Wednesday";
weekday[4] = "Thursday";
weekday[5] = "Friday";
weekday[6] = "Saturday";
var audio = new Audio('sound.mp3');

function init() {
    getPermission();
    initTasks();
    taskInput();
    initCalendar();
    refreshCalendar();
    $(document).ready(function(){
        $('body').on('click', 'a.create-new', function(e) {
            setCurrentTask(createTask($(e.target).attr('data-name'), $('#new-task-description').val()));
            $('#task-input').val('');
            taskInput();
        });
        $('body').on('click', 'a.task', function(e) {
            var taskName = $(e.target).attr('data-name');
            var taskToSet;
            if (taskName === '') {
                taskToSet = emptyTask;
            } else {
                taskToSet = getMatchingTasks(taskName).perfectMatch;
            }
            setCurrentTask(taskToSet);
            $('.task').removeClass('selected');
            $(e.target).addClass('selected');
        });
    });
}

function initCalendar() {
    currentDay = new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + (new Date().getDate());    
    var savedCalendar = localStorage.getItem("calendar");
    if (savedCalendar) {
        calendar = JSON.parse(savedCalendar);
    } else {
        calendar = {};
    }
}

function initTasks() {
    var savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    } else {
        tasks = [];
    }
}

function getPermission() {
    Notification.requestPermission().then(function(result) {
        notificationPermission = result === 'granted';
    });
}

function getTimerValue() {
    return +($('#timer').attr('data-seconds'));
}

function setTimerValue(seconds) {
    $('#timer').attr('data-seconds', seconds);
    var displayedMinutes = Math.floor(seconds / 60);
    var displayedSeconds = seconds % 60
    var displayedTime = formatTime(displayedMinutes, displayedSeconds);
    $('#timer').html(displayedTime);
    document.title = displayedTime;
}

function tick() {
    if (paused) return;
    var newSeconds = getTimerValue() - 1;
    var displayedTime = setTimerValue(newSeconds);
    if (newSeconds == 0) {
        timerEnd();
    }
}

function fastForward() {
    setTimerValue(0);
    timerEnd();
    paused = false;
}

function togglePause(){
    if (!timerInterval) startWork();
    else paused = !paused;
}

function timerEnd() {
    clearInterval(timerInterval);
    if (notificationPermission) {
        new Notification('Time\'s up!');
        audio.play();
    }
    if (typeof timerCallback === "function") {
        timerCallback();
    }
}

function startWork() {
    startTimer(workLength, cbWork);
}

function startShortBreak() {
    startTimer(shortBreakLength);
}

function startLongBreak() {
    startTimer(longBreakLength);
}

function startTimer(seconds, callback) {
    paused = false;
    clearInterval(timerInterval);
    setTimerValue(seconds);
    timerInterval = setInterval(function(){tick();}, 1000);
    timerCallback = callback;
}

function cbWork() {
    if (currentTask == emptyTask && $('#task-input').val().length) {
        setCurrentTask(createTask($('#task-input').val(), $('#new-task-description').val()));
    }
    var hour = new Date().getHours();
    var minute = new Date().getMinutes();
    if (!calendar[currentDay]) {
        calendar[currentDay] = {entries: []};
    }
    calendar[currentDay].entries.push({"task" : currentTask, "time" : formatTime(hour, minute)});
    saveCalendar();
    weekOffset = 0;
    refreshCalendar();
}

function getStartOfWeek(date) {
    return moment(date).startOf('week').toDate();
}

function calendarLeft() {
    weekOffset--;
    refreshCalendar();
}

function calendarRight() {
    weekOffset++;
    refreshCalendar();
}

function refreshCalendar() {
    var d = new Date();
    if (weekOffset > 0) {
        d = moment(d).add(weekOffset, 'weeks').toDate();
    } else if (weekOffset < 0) {
        d = moment(d).subtract(-weekOffset, 'weeks').toDate();
    }
    renderCalendar(getStartOfWeek(d));
}

function renderCalendar(weekStart) {
    $('#calendar').html('');
    var leftColumn = [];
    for (var s = (workLength + shortBreakLength); s <= 28800; s += (workLength + shortBreakLength)) {
        var hours = Math.floor(s / 3600);
        var minutes = (s % 3600) / 60;
        leftColumn.push(formatTime(hours, minutes));
    }
    var currentDayIndex;
    var grid = new Array(leftColumn.length + 2); // day names and dates
    for (var i = 0; i < grid.length; i++) {
        grid[i] = new Array(7);
    }
    for (var d = 0; d < 7; d++) {
        var day = moment(weekStart).add(d, 'days').toDate();
        var dateStr = day.getFullYear() + '-' + (day.getMonth() + 1) + '-' + day.getDate();
        if (dateStr === currentDay) {
            currentDayIndex = d;
        }
        grid[0][d] = weekday[day.getDay()];
        grid[1][d] = dateStr;
        if (calendar[dateStr]) {
            for (var i = 0; i < calendar[dateStr].entries.length; i++) {
                if (grid[i + 2] === undefined) {
                    grid[i + 2] = new Array(7);
                }
                var entry = calendar[dateStr].entries[i];
                grid[i + 2][d] = entry;
            }
        }
    }
    var calendarTable = $('<table class="table table-sm"></table>');
    var calendarHead = $('<tr><th><button class="btn" onclick="calendarLeft();"><</button></th></tr>');
    for (var d = 0; d < 7; d++) {
        var dayHead = $('<th></th>');
        if (currentDayIndex === d) {
            dayHead.addClass('bg-light');
        }
        var dayName = grid[0][d];
        var date = grid[1][d];
        dayHead.append(dayName + '<br/>' + date);
        calendarHead.append(dayHead);
    }
    calendarHead.append($('<th><button class="btn" onclick="calendarRight();">></button></th>'));
    calendarTable.append($('<thead></thead>').append(calendarHead));
    var calendarBody = $('<tbody></tbody>');
    for (var row = 2; row < grid.length; row++) {
        var calendarRow = $('<tr></tr>');
        calendarRow.append($('<td>' + leftColumn[row - 2] + '</td>'));
        for (var d = 0; d < 7; d++) {
            var entry = grid[row][d];
            var calendarCell = $('<td></td>');
            if (currentDayIndex === d) {
                calendarCell.addClass('bg-light');
            }
            if (entry !== undefined) {
                calendarCell.attr('style', 'background-color:' + entry["task"].color + '!important');
                calendarCell.attr('title', entry["task"].description);
                calendarCell.html(entry["time"]);
                calendarCell.append($('<span class="ml-2">' + entry["task"].name + '</span>'));
            }
            calendarRow.append(calendarCell);
        }
        calendarBody.append(calendarRow);
    }
    calendarTable.append(calendarBody);
    $('#calendar').append(calendarTable);
}

function taskInput() {
    $('#matching-tasks').html('');
    var text = $('#task-input').val();
    var matchingTasks = getMatchingTasks(text);
    if (matchingTasks.perfectMatch === null) {
        if (text.length) {
            $('#matching-tasks').append($('<a class="create-new btn" data-name="' + text + '">Create new task "' + text + '"</a>'));
            createTaskDescriptionInput();
        } else {
            destroyTaskDescriptionInput();
        }
    } else {
        $('#matching-tasks').append($('<a class="task btn" data-name="' + matchingTasks.perfectMatch.name + '" title="' + matchingTasks.perfectMatch.description + '" style="background-color: ' + matchingTasks.perfectMatch.color + '">' + matchingTasks.perfectMatch.name + '</a>'));
        destroyTaskDescriptionInput();
    }
    for (var i = 0; i < matchingTasks.matches.length; i++) {
        var taskText = matchingTasks.matches[i].name;
        if (taskText === '') {
            taskText = 'No task';
        }
        $('#matching-tasks').append($('<a class="task btn" data-name="' + matchingTasks.matches[i].name + '" title="' + matchingTasks.matches[i].description + '" style="background-color: ' + matchingTasks.matches[i].color + '">' + taskText + '</a>'));
    }
    $("a.task[data-name='" + currentTask.name + "']").addClass('selected');
}

function createTaskDescriptionInput() {
    if ($('#new-task-description').length) return;
    var descriptionInput = $('<input type-"text" class="form-control mt-3 mb-3" id="new-task-description" placeholder="New task description (optional)"></input>');
    $('#calendar').before(descriptionInput);
}

function destroyTaskDescriptionInput() {
    $('#new-task-description').remove();
}

function getMatchingTasks(text) {
    var uppercaseText = text.toUpperCase();
    var result = {
        perfectMatch: null,
        matches: [emptyTask]
    };
    for (var i = 0; i < tasks.length; i++) {
        var task = tasks[i];
        var uppercaseName = task.name.toUpperCase();
        if (uppercaseName === uppercaseText) {
            result.perfectMatch = task;
        } else if (uppercaseName.indexOf(uppercaseText) !== -1) {
            result.matches.push(task);
        }
    }
    return result;
}

function createTask(name, description) {
    var newTask = {name: name, description: description, color: getRandomColor()};
    tasks.push(newTask);
    saveTasks();
    return newTask;
}

function setCurrentTask(task) {
    currentTask = task;
}

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function saveCalendar() {
    localStorage.setItem("calendar", JSON.stringify(calendar));
}

function getRandomColor() {
    var golden = 0.618033988749895;
    var letters = '0123456789ABCDEF';
    var h = Math.random();
    h += golden;
    h %= 1;
    var rgb = HSVtoRGB(h, 0.5, 0.95);
    var r = rgb.r.toString(16);
    if (r.length == 1) r = '0' + r;
    var g = rgb.g.toString(16);
    if (g.length == 1) g = '0' + g;
    var b = rgb.b.toString(16);
    if (b.length == 1) b = '0' + b;
    return '#' + r + g + b;
}

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function formatTime(left, right) {
    return (left < 10 ? '0' : '') + left + ':' + (right < 10 ? '0' : '') + right;
}
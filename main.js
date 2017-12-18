"use strict"

var defaultSettings = {
    workLength : 1500,
    shortBreakLength : 300,
    longBreakLength : 600,
    workDayLength : 28800,
    includeShortBreakInChunks: true,
    includeLongBreakInChunks: false
};
var settings = getClonedDefaultSettings();
var timerInterval;
var timerCallback = null;
var paused = true;
var timerRunning = false;
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
    loadSettings();
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
        setTimerValue(settings.workLength);
    });
}

function loadSettings() {
    var savedSettings = localStorage.getItem("settings");
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }
    setSettingsInputs();
}

function saveSettings() {
    var newSettings = getClonedDefaultSettings();
    var workLengthInput = +$('#workLength').val();
    if (Number.isInteger(workLengthInput)) {
        newSettings.workLength = workLengthInput * 60;
    }
    var shortBreakLengthInput = +$('#shortBreakLength').val();
    if (Number.isInteger(shortBreakLengthInput)) {
        newSettings.shortBreakLength = shortBreakLengthInput * 60;
    }
    var longBreakLengthInput = +$('#longBreakLength').val();
    if (Number.isInteger(longBreakLengthInput)) {
        newSettings.longBreakLength = longBreakLengthInput * 60;
    }
    var workDayLengthInput = +$('#workDayLength').val();
    if (Number.isInteger(workDayLengthInput)) {
        newSettings.workDayLength = workDayLengthInput * 60;
    }
    newSettings.includeShortBreakInChunks = $('#includeShortBreak').is(':checked');
    newSettings.includeLongBreakInChunks = $('#includeLongBreak').is(':checked');
    settings = newSettings;
    localStorage.setItem("settings", JSON.stringify(settings));
    if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        paused = true;
        setPlayPauseIcon();
    }
    refreshCalendar();
    setTimerValue(settings.workLength);
    $('#toggleSettings').click();
}

function settingsClicked() {
    setSettingsInputs();
}

function resetSettings() {
    settings = getClonedDefaultSettings();
    setSettingsInputs();
    saveSettings();
}

function setSettingsInputs() {
    $('#workLength').val(settings.workLength / 60);
    $('#shortBreakLength').val(settings.shortBreakLength / 60);
    $('#longBreakLength').val(settings.longBreakLength / 60);
    $('#workDayLength').val(settings.workDayLength / 60);
    $('#includeShortBreak').prop('checked', settings.includeShortBreakInChunks);
    $('#includeLongBreak').prop('checked', settings.includeLongBreakInChunks);
}

function getClonedDefaultSettings() {
    return JSON.parse(JSON.stringify(defaultSettings));
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
    if (!timerRunning) startWork();
    else paused = !paused;
    setPlayPauseIcon(paused);
}

function setPlayPauseIcon() {
    if (paused) {
        $('#playPauseIcon').removeClass('fa-pause');
        $('#playPauseIcon').addClass('fa-play');
    } else {
        $('#playPauseIcon').removeClass('fa-play');
        $('#playPauseIcon').addClass('fa-pause');
    }
}

function timerEnd() {
    clearInterval(timerInterval);
    timerRunning = false;
    if (notificationPermission) {
        new Notification('Time\'s up!');
        audio.play();
    }
    if (typeof timerCallback === "function") {
        timerCallback();
    }
}

function startWork() {
    startTimer(settings.workLength, cbWork);
}

function startShortBreak() {
    startTimer(settings.shortBreakLength);
}

function startLongBreak() {
    startTimer(settings.longBreakLength);
}

function startTimer(seconds, callback) {
    clearInterval(timerInterval);
    setTimerValue(seconds);
    timerInterval = setInterval(function(){tick();}, 1000);
    timerRunning = true;
    timerCallback = callback;
    paused = true;
    togglePause();
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
    return moment(date).startOf('isoweek').toDate();
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
    var currentDayIndex;
    var normalChunkLength = settings.workLength;
    if (settings.includeShortBreakInChunks) {
        normalChunkLength += settings.shortBreakLength;
    }
    var grid = new Array(2 + Math.ceil(settings.workDayLength / normalChunkLength)); // 2 for day names and dates
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
    var leftColumn = [];
    var workdayEndsAtIndex = -1;
    var longBreakCounter = 0;
    for (var s = normalChunkLength; s <= Math.max(settings.workDayLength, normalChunkLength * grid.length - 2); s += normalChunkLength) {
        if (settings.includeLongBreakInChunks) {
            longBreakCounter++;
            if (longBreakCounter === 4) {
                longBreakCounter = 0;
                s += settings.longBreakLength - settings.shortBreakLength;
            }
        }
        var hours = Math.floor(s / 3600);
        var minutes = (s % 3600) / 60;
        leftColumn.push(formatTime(hours, minutes));
        if (s <= settings.workDayLength) {
            workdayEndsAtIndex++;
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
        var leftCell = $('<td>' + leftColumn[row - 2] + '</td>');
        if (row - 2 > workdayEndsAtIndex) {
            leftCell.addClass('text-muted');
        }
        calendarRow.append(leftCell);
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
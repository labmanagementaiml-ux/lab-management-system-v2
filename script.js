// Data Management
class LabManagementSystem {
    constructor() {
        this.labs = [];
        this.classes = [];
        this.labAttendance = [];
        this.classAttendance = [];
        this.editType = '';
        this.editId = '';
        this.labAttendanceEditId = '';
        this.classAttendanceEditId = '';
        this.labChart = null;
        this.classChart = null;
        this.labSlotChart = null;
        this.classSlotChart = null;
        this.groupedBarChart = null;
        this.labGroupedBarChart = null;
        this.dashboardDate = new Date().toISOString().split('T')[0];
        this.init();
    }

    init() {
        this.loadData();
        this.seedInitialData();
        this.setupEventListeners();
        this.renderAll();
        this.setTodayDate();
    }

    // API Data Management
    async loadData() {
        try {
            const [labsRes, classesRes, labAttRes, classAttRes] = await Promise.all([
                fetch('http://localhost:3000/api/labs'),
                fetch('http://localhost:3000/api/classes'),
                fetch('http://localhost:3000/api/lab-attendance'),
                fetch('http://localhost:3000/api/class-attendance')
            ]);

            if (labsRes.ok) this.labs = await labsRes.json();
            if (classesRes.ok) this.classes = await classesRes.json();
            if (labAttRes.ok) this.labAttendance = await labAttRes.json();
            if (classAttRes.ok) this.classAttendance = await classAttRes.json();
            
            // If no data, seed with initial data
            this.seedInitialData();
        } catch (error) {
            console.error('Error loading data from API, falling back to localStorage:', error);
            // Fallback to localStorage if server is not available
            const savedLabs = localStorage.getItem('labs');
            const savedClasses = localStorage.getItem('classes');
            const savedLabAttendance = localStorage.getItem('labAttendance');
            const savedClassAttendance = localStorage.getItem('classAttendance');

            if (savedLabs) this.labs = JSON.parse(savedLabs);
            if (savedClasses) this.classes = JSON.parse(savedClasses);
            if (savedLabAttendance) this.labAttendance = JSON.parse(savedLabAttendance);
            if (savedClassAttendance) this.classAttendance = JSON.parse(savedClassAttendance);
            
            this.seedInitialData();
        }
    }

    async saveData() {
        // Save to localStorage as backup
        localStorage.setItem('labs', JSON.stringify(this.labs));
        localStorage.setItem('classes', JSON.stringify(this.classes));
        localStorage.setItem('labAttendance', JSON.stringify(this.labAttendance));
        localStorage.setItem('classAttendance', JSON.stringify(this.classAttendance));
        
        // Try to sync with database
        try {
            // This is handled by individual save methods
        } catch (error) {
            console.log('Database sync failed, data saved locally');
        }
    }

    // Seed initial data
    seedInitialData() {
        if (this.labs.length === 0) {
            this.labs = [
                { id: this.generateId(), name: 'AIML-324A', strength: 40 },
                { id: this.generateId(), name: 'AIML-324D', strength: 40 },
                { id: this.generateId(), name: 'AIML-323A', strength: 40 },
                { id: this.generateId(), name: 'AIML-323B', strength: 40 },
                { id: this.generateId(), name: 'AIML-325M', strength: 40 }
            ];
            this.saveData();
        }

        if (this.classes.length === 0) {
            this.classes = [
                { id: this.generateId(), name: 'AIML-322A', strength: 90 },
                { id: this.generateId(), name: 'AIML-322B', strength: 90 },
                { id: this.generateId(), name: 'AIML-324B', strength: 90 },
                { id: this.generateId(), name: 'AIML-324C', strength: 90 }
            ];
            this.saveData();
        }
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    convertTo12HourFormat(timeSlot) {
        // Split the time slot (e.g., "9:10-11:10" or "14:20-16:20")
        const times = timeSlot.split('-');
        if (times.length !== 2) return timeSlot;
        
        const convertTime = (time) => {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            return `${displayHour}:${minutes} ${ampm}`;
        };
        
        return `${convertTime(times[0])} – ${convertTime(times[1])}`;
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('lab-attendance-date').value = today;
        document.getElementById('class-attendance-date').value = today;
        document.getElementById('dashboard-date-selector').value = today;
        this.dashboardDate = today;
    }

    showNotification(message, type = 'success') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>
                ${message}
            </div>
        `;
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Tab Management
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active state from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
            btn.classList.add('text-gray-600');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Add active state to clicked button
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-600');
            activeBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        }
        
        // Update dashboard when switching to it
        if (tabName === 'dashboard') {
            this.renderDashboard();
        }
    }

    // Lab Management
    async addLab(name, strength) {
        const lab = {
            name: name.trim(),
            subject: 'General',
            date: new Date().toISOString().split('T')[0],
            time: '09:00-11:00',
            capacity: parseInt(strength)
        };
        
        try {
            const response = await fetch('http://localhost:3000/api/labs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lab)
            });
            
            if (response.ok) {
                const result = await response.json();
                lab.id = result.id;
                this.labs.push(lab);
                this.saveData();
                this.renderLabs();
                this.updateLabSelect();
                this.renderDashboard();
                this.showNotification(`Lab "${name}" added successfully!`);
            } else {
                throw new Error('Failed to save to database');
            }
        } catch (error) {
            // Fallback to localStorage if database fails
            lab.id = this.generateId();
            this.labs.push(lab);
            this.saveData();
            this.renderLabs();
            this.updateLabSelect();
            this.renderDashboard();
            this.showNotification(`Lab "${name}" added locally!`);
        }
    }

    async editLab(id, name, strength) {
        const labIndex = this.labs.findIndex(lab => lab.id === id);
        if (labIndex !== -1) {
            const labData = {
                name: name.trim(),
                subject: 'General',
                date: new Date().toISOString().split('T')[0],
                time: '09:00-11:00',
                capacity: parseInt(strength)
            };
            
            try {
                const response = await fetch(`http://localhost:3000/api/labs/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(labData)
                });
                
                if (response.ok) {
                    this.labs[labIndex] = { ...this.labs[labIndex], ...labData };
                    this.saveData();
                    this.renderLabs();
                    this.updateLabSelect();
                    this.renderDashboard();
                    this.showNotification(`Lab "${name}" updated successfully!`);
                } else {
                    throw new Error('Failed to update in database');
                }
            } catch (error) {
                // Fallback to localStorage if database fails
                this.labs[labIndex].name = name.trim();
                this.labs[labIndex].strength = parseInt(strength);
                this.saveData();
                this.renderLabs();
                this.updateLabSelect();
                this.renderDashboard();
                this.showNotification(`Lab "${name}" updated locally!`);
            }
        }
    }

    async deleteLab(id) {
        const lab = this.labs.find(lab => lab.id === id);
        if (confirm(`Are you sure you want to delete lab "${lab.name}"?`)) {
            try {
                const response = await fetch(`http://localhost:3000/api/labs/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.labs = this.labs.filter(lab => lab.id !== id);
                    this.labAttendance = this.labAttendance.filter(entry => entry.labId !== id);
                    this.saveData();
                    this.renderLabs();
                    this.renderLabAttendance();
                    this.updateLabSelect();
                    this.renderDashboard();
                    this.showNotification(`Lab "${lab.name}" deleted successfully!`);
                } else {
                    throw new Error('Failed to delete from database');
                }
            } catch (error) {
                // Fallback to localStorage if database fails
                this.labs = this.labs.filter(lab => lab.id !== id);
                this.labAttendance = this.labAttendance.filter(entry => entry.labId !== id);
                this.saveData();
                this.renderLabs();
                this.renderLabAttendance();
                this.updateLabSelect();
                this.renderDashboard();
                this.showNotification(`Lab "${lab.name}" deleted locally!`);
            }
        }
    }

    renderLabs() {
        const tbody = document.getElementById('lab-table-body');
        tbody.innerHTML = '';
        
        this.labs.forEach(lab => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${lab.name}</td>
                <td class="px-4 py-3 text-sm text-gray-700">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${lab.strength}/40
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                    <button onclick="openEditModal('lab', '${lab.id}', '${lab.name}', ${lab.strength})" class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="system.deleteLab('${lab.id}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Class Management
    addClass(name, strength) {
        const classItem = {
            id: this.generateId(),
            name: name.trim(),
            strength: parseInt(strength)
        };
        this.classes.push(classItem);
        this.saveData();
        this.renderClasses();
        this.updateClassSelect();
        this.renderDashboard();
        this.showNotification(`Class "${name}" added successfully!`);
    }

    editClass(id, name, strength) {
        const classIndex = this.classes.findIndex(cls => cls.id === id);
        if (classIndex !== -1) {
            this.classes[classIndex].name = name.trim();
            this.classes[classIndex].strength = parseInt(strength);
            this.saveData();
            this.renderClasses();
            this.updateClassSelect();
            this.renderDashboard();
            this.showNotification(`Class "${name}" updated successfully!`);
        }
    }

    deleteClass(id) {
        const classItem = this.classes.find(cls => cls.id === id);
        if (confirm(`Are you sure you want to delete class "${classItem.name}"?`)) {
            this.classes = this.classes.filter(cls => cls.id !== id);
            this.classAttendance = this.classAttendance.filter(entry => entry.classId !== id);
            this.saveData();
            this.renderClasses();
            this.renderClassAttendance();
            this.updateClassSelect();
            this.renderDashboard();
            this.showNotification(`Class "${classItem.name}" deleted successfully!`);
        }
    }

    renderClasses() {
        const tbody = document.getElementById('class-table-body');
        tbody.innerHTML = '';
        
        this.classes.forEach(classItem => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${classItem.name}</td>
                <td class="px-4 py-3 text-sm text-gray-700">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        ${classItem.strength}/90
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                    <button onclick="openEditModal('class', '${classItem.id}', '${classItem.name}', ${classItem.strength})" class="text-purple-600 hover:text-purple-900 mr-3">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="system.deleteClass('${classItem.id}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Lab Attendance
    addLabAttendance(date, labId, slot, count) {
        const lab = this.labs.find(l => l.id === labId);
        if (!lab) return;

        const attendance = {
            id: this.generateId(),
            date: date,
            labId: labId,
            labName: lab.name,
            slot: slot,
            count: parseInt(count)
        };
        
        this.labAttendance.push(attendance);
        this.saveData();
        this.renderLabAttendance();
        this.renderDashboard();
        this.showNotification(`Lab attendance entry added successfully!`);
    }

    deleteLabAttendance(id) {
        if (confirm('Are you sure you want to delete this attendance entry?')) {
            this.labAttendance = this.labAttendance.filter(entry => entry.id !== id);
            this.saveData();
            this.renderLabAttendance();
            this.renderDashboard();
            this.showNotification('Attendance entry deleted successfully!');
        }
    }

    updateLabAttendance(id, date, labId, slot, count) {
        const lab = this.labs.find(l => l.id === labId);
        if (!lab) return;

        const attendanceIndex = this.labAttendance.findIndex(entry => entry.id === id);
        if (attendanceIndex !== -1) {
            this.labAttendance[attendanceIndex] = {
                id: id,
                date: date,
                labId: labId,
                labName: lab.name,
                slot: slot,
                count: parseInt(count)
            };
            
            this.saveData();
            this.renderLabAttendance();
            this.renderDashboard();
            this.showNotification(`Lab attendance entry updated successfully!`);
        }
    }

    renderLabAttendance() {
        const tbody = document.getElementById('lab-attendance-table-body');
        tbody.innerHTML = '';
        
        // Sort by date (newest first) and then by lab name
        const sortedAttendance = [...this.labAttendance].sort((a, b) => {
            const dateCompare = new Date(b.date) - new Date(a.date);
            if (dateCompare !== 0) return dateCompare;
            return a.labName.localeCompare(b.labName);
        });
        
        sortedAttendance.forEach(entry => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${new Date(entry.date).toLocaleDateString()}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${entry.labName}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${this.convertTo12HourFormat(entry.slot)}</td>
                <td class="px-4 py-3 text-sm text-gray-700">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ${entry.count} students
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                    <button onclick="openEditLabAttendanceModal('${entry.id}', '${entry.date}', '${entry.labId}', '${entry.slot}', ${entry.count})" class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="system.deleteLabAttendance('${entry.id}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Class Attendance
    addClassAttendance(date, classId, slot, count) {
        const classItem = this.classes.find(c => c.id === classId);
        if (!classItem) return;

        const attendance = {
            id: this.generateId(),
            date: date,
            classId: classId,
            className: classItem.name,
            slot: slot,
            count: parseInt(count)
        };
        
        this.classAttendance.push(attendance);
        this.saveData();
        this.renderClassAttendance();
        this.renderDashboard();
        this.showNotification(`Class attendance entry added successfully!`);
    }

    deleteClassAttendance(id) {
        if (confirm('Are you sure you want to delete this attendance entry?')) {
            this.classAttendance = this.classAttendance.filter(entry => entry.id !== id);
            this.saveData();
            this.renderClassAttendance();
            this.renderDashboard();
            this.showNotification('Attendance entry deleted successfully!');
        }
    }

    updateClassAttendance(id, date, classId, slot, count) {
        const classItem = this.classes.find(c => c.id === classId);
        if (!classItem) return;

        const attendanceIndex = this.classAttendance.findIndex(entry => entry.id === id);
        if (attendanceIndex !== -1) {
            this.classAttendance[attendanceIndex] = {
                id: id,
                date: date,
                classId: classId,
                className: classItem.name,
                slot: slot,
                count: parseInt(count)
            };
            
            this.saveData();
            this.renderClassAttendance();
            this.renderDashboard();
            this.showNotification(`Class attendance entry updated successfully!`);
        }
    }

    renderClassAttendance() {
        const tbody = document.getElementById('class-attendance-table-body');
        tbody.innerHTML = '';
        
        // Sort by date (newest first) and then by class name
        const sortedAttendance = [...this.classAttendance].sort((a, b) => {
            const dateCompare = new Date(b.date) - new Date(a.date);
            if (dateCompare !== 0) return dateCompare;
            return a.className.localeCompare(b.className);
        });
        
        sortedAttendance.forEach(entry => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-900">${new Date(entry.date).toLocaleDateString()}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${entry.className}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${this.convertTo12HourFormat(entry.slot)}</td>
                <td class="px-4 py-3 text-sm text-gray-700">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ${entry.count} students
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                    <button onclick="openEditClassAttendanceModal('${entry.id}', '${entry.date}', '${entry.classId}', '${entry.slot}', ${entry.count})" class="text-purple-600 hover:text-purple-900 mr-3">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="system.deleteClassAttendance('${entry.id}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Update select options
    updateLabSelect() {
        const select = document.getElementById('lab-attendance-lab');
        select.innerHTML = '<option value="">Select Lab</option>';
        this.labs.forEach(lab => {
            const option = document.createElement('option');
            option.value = lab.id;
            option.textContent = `${lab.name} (Capacity: ${lab.strength})`;
            select.appendChild(option);
        });
    }

    updateClassSelect() {
        const select = document.getElementById('class-attendance-class');
        select.innerHTML = '<option value="">Select Class</option>';
        this.classes.forEach(classItem => {
            const option = document.createElement('option');
            option.value = classItem.id;
            option.textContent = `${classItem.name} (Capacity: ${classItem.strength})`;
            select.appendChild(option);
        });
    }

    // Export XLS and Import XLS functionality
    exportData(format) {
        if (format === 'xls') {
            // Prepare data for Excel export
            const exportData = [];
            
            // Add headers
            exportData.push(['Date', 'Lab/Class Name', 'Type', 'Slot', 'Student Count']);
            
            // Add lab attendance data
            this.labAttendance.forEach(entry => {
                exportData.push([entry.date, entry.labName, 'Lab', entry.slot, entry.count]);
            });
            
            // Add class attendance data
            this.classAttendance.forEach(entry => {
                exportData.push([entry.date, entry.className, 'Class', entry.slot, entry.count]);
            });
            
            // Create workbook
            const ws = XLSX.utils.aoa_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Attendance Data');
            
            // Generate filename with current date
            const fileName = `attendance-data-${new Date().toISOString().split('T')[0]}.xlsx`;
            
            // Save file
            XLSX.writeFile(wb, fileName);
            
            this.showNotification('Attendance data exported successfully as XLS!');
        }
    }

    exportLabSummaryToXLS() {
        // Prepare lab summary data for Excel export
        const exportData = [];
        
        // Add headers
        exportData.push(['Lab Name', 'Capacity', '9:10-11:10 AM', '12:10-2:10 PM', '2:20-4:20 PM', 'Total']);
        
        // Add lab summary data for selected date
        this.labs.forEach(lab => {
            // Calculate attendance for each slot
            const slot1Attendance = this.labAttendance
                .filter(entry => entry.labId === lab.id && entry.date === this.dashboardDate && entry.slot === '9:10-11:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot2Attendance = this.labAttendance
                .filter(entry => entry.labId === lab.id && entry.date === this.dashboardDate && entry.slot === '12:10-14:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot3Attendance = this.labAttendance
                .filter(entry => entry.labId === lab.id && entry.date === this.dashboardDate && entry.slot === '14:20-16:20')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const totalAttendance = slot1Attendance + slot2Attendance + slot3Attendance;
            
            exportData.push([
                lab.name,
                lab.strength,
                slot1Attendance,
                slot2Attendance,
                slot3Attendance,
                totalAttendance
            ]);
        });
        
        // Create workbook
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Lab Summary');
        
        // Generate filename with selected date
        const fileName = `lab-summary-${this.dashboardDate}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, fileName);
        
        this.showNotification('Lab summary data exported successfully as XLS!');
    }

    exportClassSummaryToXLS() {
        // Prepare class summary data for Excel export
        const exportData = [];
        
        // Add headers
        exportData.push(['Class Name', 'Capacity', '9:10-10:10 AM', '10:10-11:10 AM', '12:10-1:10 PM', '1:10-2:10 PM', '2:20-3:20 PM', '3:20-4:20 PM', 'Total']);
        
        // Add class summary data for selected date
        this.classes.forEach(classItem => {
            // Calculate attendance for each slot
            const slot1Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '9:10-10:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot2Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '10:10-11:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot3Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '12:10-13:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot4Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '13:10-14:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot5Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '14:20-15:20')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot6Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '15:20-16:20')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const totalAttendance = slot1Attendance + slot2Attendance + slot3Attendance + slot4Attendance + slot5Attendance + slot6Attendance;
            
            exportData.push([
                classItem.name,
                classItem.strength,
                slot1Attendance,
                slot2Attendance,
                slot3Attendance,
                slot4Attendance,
                slot5Attendance,
                slot6Attendance,
                totalAttendance
            ]);
        });
        
        // Create workbook
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Class Summary');
        
        // Generate filename with selected date
        const fileName = `class-summary-${this.dashboardDate}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, fileName);
        
        this.showNotification('Class summary data exported successfully as XLS!');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get the first worksheet
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                
                // Clear existing attendance data
                this.labAttendance = [];
                this.classAttendance = [];
                
                // Process imported data
                jsonData.forEach(row => {
                    if (row['Type'] === 'Lab') {
                        const lab = this.labs.find(l => l.name === row['Lab/Class Name']);
                        if (lab) {
                            this.labAttendance.push({
                                id: this.generateId(),
                                date: row['Date'],
                                labId: lab.id,
                                labName: row['Lab/Class Name'],
                                slot: row['Slot'],
                                count: parseInt(row['Student Count']) || 0
                            });
                        }
                    } else if (row['Type'] === 'Class') {
                        const classItem = this.classes.find(c => c.name === row['Lab/Class Name']);
                        if (classItem) {
                            this.classAttendance.push({
                                id: this.generateId(),
                                date: row['Date'],
                                classId: classItem.id,
                                className: row['Lab/Class Name'],
                                slot: row['Slot'],
                                count: parseInt(row['Student Count']) || 0
                            });
                        }
                    }
                });
                
                this.saveData();
                this.renderLabAttendance();
                this.renderClassAttendance();
                this.renderDashboard();
                this.showNotification('Attendance data imported successfully from XLS!');
            } catch (error) {
                this.showNotification('Error importing XLS data. Please check the file format.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        
        // Reset the file input
        event.target.value = '';
    }

    // Dashboard Methods
    renderDashboard() {
        this.updateSummaryCards();
        this.renderDashboardTables();
        this.renderCharts();
    }

    updateSummaryCards() {
        // Update total counts
        document.getElementById('total-labs').textContent = this.labs.length;
        document.getElementById('total-classes').textContent = this.classes.length;
        
        // Calculate lab attendance for selected date
        const selectedLabAttendance = this.labAttendance
            .filter(entry => entry.date === this.dashboardDate)
            .reduce((sum, entry) => sum + entry.count, 0);
        document.getElementById('today-lab-attendance').textContent = selectedLabAttendance;
        
        // Calculate class attendance for selected date
        const selectedClassAttendance = this.classAttendance
            .filter(entry => entry.date === this.dashboardDate)
            .reduce((sum, entry) => sum + entry.count, 0);
        document.getElementById('today-class-attendance').textContent = selectedClassAttendance;
    }

    renderDashboardTables() {
        this.renderDashboardLabTable();
        this.renderDashboardClassTable();
    }

    renderDashboardLabTable() {
        const tbody = document.getElementById('dashboard-lab-table');
        tbody.innerHTML = '';
        
        this.labs.forEach(lab => {
            // Calculate attendance for each slot
            const slot1Attendance = this.labAttendance
                .filter(entry => entry.labId === lab.id && entry.date === this.dashboardDate && entry.slot === '9:10-11:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot2Attendance = this.labAttendance
                .filter(entry => entry.labId === lab.id && entry.date === this.dashboardDate && entry.slot === '12:10-14:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot3Attendance = this.labAttendance
                .filter(entry => entry.labId === lab.id && entry.date === this.dashboardDate && entry.slot === '14:20-16:20')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const totalAttendance = slot1Attendance + slot2Attendance + slot3Attendance;
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-3 py-2 text-sm font-medium text-gray-900">${lab.name}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${lab.strength}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${slot1Attendance}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${slot2Attendance}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${slot3Attendance}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${totalAttendance}</td>
            `;
            tbody.appendChild(row);
        });
    }

    renderDashboardClassTable() {
        const tbody = document.getElementById('dashboard-class-table');
        tbody.innerHTML = '';
        
        this.classes.forEach(classItem => {
            // Calculate attendance for each slot
            const slot1Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '9:10-10:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot2Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '10:10-11:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot3Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '12:10-13:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot4Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '13:10-14:10')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot5Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '14:20-15:20')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const slot6Attendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate && entry.slot === '15:20-16:20')
                .reduce((sum, entry) => sum + entry.count, 0);
            
            const totalAttendance = slot1Attendance + slot2Attendance + slot3Attendance + slot4Attendance + slot5Attendance + slot6Attendance;
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-3 py-2 text-sm font-medium text-gray-900">${classItem.name}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${classItem.strength}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${slot1Attendance}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${slot2Attendance}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${slot3Attendance}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${slot4Attendance}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${slot5Attendance}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${slot6Attendance}</td>
                <td class="px-3 py-2 text-sm text-gray-700 text-center">${totalAttendance}</td>
            `;
            tbody.appendChild(row);
        });
    }

    renderCharts() {
        this.renderLabAttendanceChart();
        this.renderClassAttendanceChart();
        this.renderLabSlotChart();
        this.renderClassSlotChart();
        this.renderGroupedBarChart();
        this.renderLabGroupedBarChart();
    }

    renderLabAttendanceChart() {
        const ctx = document.getElementById('lab-attendance-chart').getContext('2d');
        
        // Get selected date
        const shortDate = new Date(this.dashboardDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Calculate lab attendance by lab for selected date
        const labNames = [];
        const labAttendanceData = [];
        
        this.labs.forEach(lab => {
            const selectedDateAttendance = this.labAttendance
                .filter(entry => entry.labId === lab.id && entry.date === this.dashboardDate)
                .reduce((sum, entry) => sum + entry.count, 0);
            
            labNames.push(lab.name);
            labAttendanceData.push(selectedDateAttendance);
        });
        
        if (this.labChart) {
            this.labChart.destroy();
        }
        
        this.labChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labNames,
                datasets: [{
                    label: `Lab Attendance - ${shortDate}`,
                    data: labAttendanceData,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 120,
                        title: {
                            display: true,
                            text: 'Number of Students'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    renderClassAttendanceChart() {
        const ctx = document.getElementById('class-attendance-chart').getContext('2d');
        
        // Get selected date
        const shortDate = new Date(this.dashboardDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Calculate class attendance by class for selected date
        const classNames = [];
        const classAttendanceData = [];
        
        this.classes.forEach(classItem => {
            const selectedDateAttendance = this.classAttendance
                .filter(entry => entry.classId === classItem.id && entry.date === this.dashboardDate)
                .reduce((sum, entry) => sum + entry.count, 0);
            
            classNames.push(classItem.name);
            classAttendanceData.push(selectedDateAttendance);
        });
        
        if (this.classChart) {
            this.classChart.destroy();
        }
        
        this.classChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: classNames,
                datasets: [{
                    label: `Class Attendance - ${shortDate}`,
                    data: classAttendanceData,
                    backgroundColor: 'rgba(147, 51, 234, 0.5)',
                    borderColor: 'rgba(147, 51, 234, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 300,
                        title: {
                            display: true,
                            text: 'Number of Students'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    renderLabSlotChart() {
        const ctx = document.getElementById('lab-slot-chart').getContext('2d');
        
        // Define lab slots
        const labSlots = ['9:10-11:10', '12:10-14:10', '14:20-16:20'];
        const slotLabels = ['9:10-11:10', '12:10-2:10', '2:20-4:20'];
        const slotData = [];
        
        // Calculate students per slot for selected date
        labSlots.forEach(slot => {
            const slotAttendance = this.labAttendance
                .filter(entry => entry.date === this.dashboardDate && entry.slot === slot)
                .reduce((sum, entry) => sum + entry.count, 0);
            
            slotData.push(slotAttendance);
        });
        
        if (this.labSlotChart) {
            this.labSlotChart.destroy();
        }
        
        this.labSlotChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: slotLabels,
                datasets: [{
                    label: `Lab Students per Slot - ${new Date(this.dashboardDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                    data: slotData,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 120,
                        title: {
                            display: true,
                            text: 'Number of Students'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    renderClassSlotChart() {
        const ctx = document.getElementById('class-slot-chart').getContext('2d');
        
        // Define class slots
        const classSlots = ['9:10-10:10', '10:10-11:10', '12:10-13:10', '13:10-14:10', '14:20-15:20', '15:20-16:20'];
        const slotLabels = ['9:10-10:10', '10:10-11:10', '12:10-1:10', '1:10-2:10', '2:20-3:20', '3:20-4:20'];
        const slotData = [];
        
        // Calculate students per slot for selected date
        classSlots.forEach(slot => {
            const slotAttendance = this.classAttendance
                .filter(entry => entry.date === this.dashboardDate && entry.slot === slot)
                .reduce((sum, entry) => sum + entry.count, 0);
            
            slotData.push(slotAttendance);
        });
        
        if (this.classSlotChart) {
            this.classSlotChart.destroy();
        }
        
        this.classSlotChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: slotLabels,
                datasets: [{
                    label: `Class Students per Slot - ${new Date(this.dashboardDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                    data: slotData,
                    backgroundColor: 'rgba(147, 51, 234, 0.5)',
                    borderColor: 'rgba(147, 51, 234, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 180,
                        title: {
                            display: true,
                            text: 'Number of Students'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    renderGroupedBarChart() {
        const ctx = document.getElementById('grouped-bar-chart').getContext('2d');
        
        // Get unique class names from attendance data for selected date
        const selectedDateAttendance = this.classAttendance.filter(entry => entry.date === this.dashboardDate);
        const classNames = [...new Set(selectedDateAttendance.map(entry => entry.className))];
        
        // Define time slots
        const timeSlots = ['9:10-10:10', '10:10-11:10', '12:10-13:10', '13:10-14:10'];
        const slotLabels = ['9:10-10:10', '10:10-11:10', '12:10-1:10', '1:10-2:10'];
        
        // Colors for different time slots
        const colors = [
            'rgba(59, 130, 246, 0.7)',  // Blue
            'rgba(16, 185, 129, 0.7)',  // Green  
            'rgba(251, 146, 60, 0.7)',  // Orange
            'rgba(147, 51, 234, 0.7)'   // Purple
        ];
        
        const borderColors = [
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(251, 146, 60, 1)',
            'rgba(147, 51, 234, 1)'
        ];
        
        // Create datasets for each time slot
        const datasets = timeSlots.map((slot, index) => {
            const data = classNames.map(className => {
                const attendance = selectedDateAttendance.find(entry => 
                    entry.className === className && entry.slot === slot
                );
                return attendance ? attendance.count : 0;
            });
            
            return {
                label: slotLabels[index],
                data: data,
                backgroundColor: colors[index],
                borderColor: borderColors[index],
                borderWidth: 1
            };
        });
        
        if (this.groupedBarChart) {
            this.groupedBarChart.destroy();
        }
        
        this.groupedBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: classNames,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Class Names'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Number of Students'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} students`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderLabGroupedBarChart() {
        const ctx = document.getElementById('lab-grouped-bar-chart').getContext('2d');
        
        // Get unique lab names from attendance data for selected date
        const selectedDateLabAttendance = this.labAttendance.filter(entry => entry.date === this.dashboardDate);
        const labNames = [...new Set(selectedDateLabAttendance.map(entry => entry.labName))];
        
        // Define lab time slots
        const labTimeSlots = ['9:10-11:10', '12:10-14:10', '14:20-16:20'];
        const slotLabels = ['9:10-11:10', '12:10-2:10', '2:20-4:20'];
        
        // Colors for different lab time slots
        const labColors = [
            'rgba(239, 68, 68, 0.7)',   // Red
            'rgba(245, 158, 11, 0.7)',  // Amber  
            'rgba(6, 182, 212, 0.7)'    // Cyan
        ];
        
        const labBorderColors = [
            'rgba(239, 68, 68, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(6, 182, 212, 1)'
        ];
        
        // Create datasets for each lab time slot
        const labDatasets = labTimeSlots.map((slot, index) => {
            const data = labNames.map(labName => {
                const attendance = selectedDateLabAttendance.find(entry => 
                    entry.labName === labName && entry.slot === slot
                );
                return attendance ? attendance.count : 0;
            });
            
            return {
                label: slotLabels[index],
                data: data,
                backgroundColor: labColors[index],
                borderColor: labBorderColors[index],
                borderWidth: 1
            };
        });
        
        if (this.labGroupedBarChart) {
            this.labGroupedBarChart.destroy();
        }
        
        this.labGroupedBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labNames,
                datasets: labDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Lab Names'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 50,
                        title: {
                            display: true,
                            text: 'Number of Students'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} students`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Render all components
    renderAll() {
        this.renderLabs();
        this.renderClasses();
        this.renderLabAttendance();
        this.renderClassAttendance();
        this.updateLabSelect();
        this.updateClassSelect();
        this.renderDashboard();
    }

    // Setup event listeners
    setupEventListeners() {
        // Lab form
        document.getElementById('add-lab-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('lab-name').value;
            const strength = document.getElementById('lab-strength').value;
            
            if (strength < 0 || strength > 40) {
                this.showNotification('Lab strength must be between 0 and 40!', 'error');
                return;
            }
            
            this.addLab(name, strength);
            e.target.reset();
        });

        // Class form
        document.getElementById('add-class-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('class-name').value;
            const strength = document.getElementById('class-strength').value;
            
            if (strength < 0 || strength > 90) {
                this.showNotification('Class strength must be between 0 and 90!', 'error');
                return;
            }
            
            this.addClass(name, strength);
            e.target.reset();
        });

        // Edit form
        document.getElementById('edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('edit-name').value;
            const strength = document.getElementById('edit-strength').value;
            
            if (this.editType === 'lab') {
                if (strength < 0 || strength > 40) {
                    this.showNotification('Lab strength must be between 0 and 40!', 'error');
                    return;
                }
                this.editLab(this.editId, name, strength);
            } else if (this.editType === 'class') {
                if (strength < 0 || strength > 90) {
                    this.showNotification('Class strength must be between 0 and 90!', 'error');
                    return;
                }
                this.editClass(this.editId, name, strength);
            }
            
            closeEditModal();
        });

        // Dashboard date selector
        document.getElementById('dashboard-date-selector').addEventListener('change', (e) => {
            this.dashboardDate = e.target.value;
            this.renderDashboard();
            this.showNotification(`Dashboard updated to show data for ${new Date(this.dashboardDate).toLocaleDateString()}`);
        });

        // Lab attendance edit form
        document.getElementById('lab-attendance-edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('edit-lab-attendance-date').value;
            const labId = document.getElementById('edit-lab-attendance-lab').value;
            const slot = document.getElementById('edit-lab-attendance-slot').value;
            const count = document.getElementById('edit-lab-attendance-count').value;
            
            if (!date || !labId || !slot || !count) {
                this.showNotification('Please fill all fields!', 'error');
                return;
            }
            
            const lab = this.labs.find(l => l.id === labId);
            if (parseInt(count) > lab.strength) {
                this.showNotification(`Student count cannot exceed lab capacity (${lab.strength})!`, 'error');
                return;
            }
            
            this.updateLabAttendance(this.labAttendanceEditId, date, labId, slot, count);
            closeLabAttendanceEditModal();
        });

        // Class attendance edit form
        document.getElementById('class-attendance-edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('edit-class-attendance-date').value;
            const classId = document.getElementById('edit-class-attendance-class').value;
            const slot = document.getElementById('edit-class-attendance-slot').value;
            const count = document.getElementById('edit-class-attendance-count').value;
            
            if (!date || !classId || !slot || !count) {
                this.showNotification('Please fill all fields!', 'error');
                return;
            }
            
            const classItem = this.classes.find(c => c.id === classId);
            if (parseInt(count) > classItem.strength) {
                this.showNotification(`Student count cannot exceed class capacity (${classItem.strength})!`, 'error');
                return;
            }
            
            this.updateClassAttendance(this.classAttendanceEditId, date, classId, slot, count);
            closeClassAttendanceEditModal();
        });
    }
}

// Global functions
let system;

function switchTab(tabName) {
    system.switchTab(tabName);
}

function switchManagementTab(tabName) {
    // Hide all management sub-tabs
    document.querySelectorAll('.management-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active state from all management buttons
    document.querySelectorAll('.management-tab-btn').forEach(btn => {
        btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600', 'text-purple-600', 'border-b-2', 'border-purple-600');
        btn.classList.add('text-gray-600');
    });
    
    // Show selected sub-tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active state to clicked button
    const activeBtn = document.querySelector(`[data-management-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-600');
        if (tabName === 'add-lab') {
            activeBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        } else if (tabName === 'add-class') {
            activeBtn.classList.add('text-purple-600', 'border-b-2', 'border-purple-600');
        }
    }
}

function switchAttendanceTab(tabName) {
    // Hide all attendance sub-tabs
    document.querySelectorAll('.attendance-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active state from all attendance buttons
    document.querySelectorAll('.attendance-tab-btn').forEach(btn => {
        btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600', 'text-purple-600', 'border-b-2', 'border-purple-600');
        btn.classList.add('text-gray-600');
    });
    
    // Show selected sub-tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active state to clicked button
    const activeBtn = document.querySelector(`[data-attendance-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-600');
        if (tabName === 'lab-student-attendance') {
            activeBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        } else if (tabName === 'class-student-attendance') {
            activeBtn.classList.add('text-purple-600', 'border-b-2', 'border-purple-600');
        }
    }
}

function resetDashboardDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dashboard-date-selector').value = today;
    system.dashboardDate = today;
    system.renderDashboard();
    system.showNotification('Dashboard reset to show today\'s data');
}

function exportLabSummaryToXLS() {
    system.exportLabSummaryToXLS();
}

function exportClassSummaryToXLS() {
    system.exportClassSummaryToXLS();
}

function openEditLabAttendanceModal(id, date, labId, slot, count) {
    system.labAttendanceEditId = id;
    
    // Populate form with existing data
    document.getElementById('edit-lab-attendance-date').value = date;
    document.getElementById('edit-lab-attendance-lab').value = labId;
    document.getElementById('edit-lab-attendance-slot').value = slot;
    document.getElementById('edit-lab-attendance-count').value = count;
    
    // Update lab options
    const labSelect = document.getElementById('edit-lab-attendance-lab');
    labSelect.innerHTML = '<option value="">Select Lab</option>';
    system.labs.forEach(lab => {
        const option = document.createElement('option');
        option.value = lab.id;
        option.textContent = `${lab.name} (Capacity: ${lab.strength})`;
        labSelect.appendChild(option);
    });
    
    // Show modal
    const modal = document.getElementById('lab-attendance-edit-modal');
    modal.classList.add('active');
}

function closeLabAttendanceEditModal() {
    document.getElementById('lab-attendance-edit-modal').classList.remove('active');
    document.getElementById('lab-attendance-edit-form').reset();
}

function openEditClassAttendanceModal(id, date, classId, slot, count) {
    system.classAttendanceEditId = id;
    
    // Populate form with existing data
    document.getElementById('edit-class-attendance-date').value = date;
    document.getElementById('edit-class-attendance-class').value = classId;
    document.getElementById('edit-class-attendance-slot').value = slot;
    document.getElementById('edit-class-attendance-count').value = count;
    
    // Update class options
    const classSelect = document.getElementById('edit-class-attendance-class');
    classSelect.innerHTML = '<option value="">Select Class</option>';
    system.classes.forEach(classItem => {
        const option = document.createElement('option');
        option.value = classItem.id;
        option.textContent = `${classItem.name} (Capacity: ${classItem.strength})`;
        classSelect.appendChild(option);
    });
    
    // Show modal
    const modal = document.getElementById('class-attendance-edit-modal');
    modal.classList.add('active');
}

function closeClassAttendanceEditModal() {
    document.getElementById('class-attendance-edit-modal').classList.remove('active');
    document.getElementById('class-attendance-edit-form').reset();
}

function openEditModal(type, id, name, strength) {
    system.editType = type;
    system.editId = id;
    
    document.getElementById('edit-name').value = name;
    document.getElementById('edit-strength').value = strength;
    
    const modal = document.getElementById('edit-modal');
    modal.classList.add('active');
    
    // Update max value based on type
    const strengthInput = document.getElementById('edit-strength');
    if (type === 'lab') {
        strengthInput.max = 40;
        strengthInput.placeholder = '0-40';
    } else {
        strengthInput.max = 90;
        strengthInput.placeholder = '0-90';
    }
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
    document.getElementById('edit-form').reset();
}

function addLabAttendance() {
    const date = document.getElementById('lab-attendance-date').value;
    const labId = document.getElementById('lab-attendance-lab').value;
    const slot = document.getElementById('lab-attendance-slot').value;
    const count = document.getElementById('lab-attendance-count').value;
    
    if (!date || !labId || !slot || !count) {
        system.showNotification('Please fill all fields!', 'error');
        return;
    }
    
    const lab = system.labs.find(l => l.id === labId);
    if (parseInt(count) > lab.strength) {
        system.showNotification(`Student count cannot exceed lab capacity (${lab.strength})!`, 'error');
        return;
    }
    
    system.addLabAttendance(date, labId, slot, count);
    
    // Reset form
    document.getElementById('lab-attendance-lab').value = '';
    document.getElementById('lab-attendance-slot').value = '';
    document.getElementById('lab-attendance-count').value = '';
}

function addClassAttendance() {
    const date = document.getElementById('class-attendance-date').value;
    const classId = document.getElementById('class-attendance-class').value;
    const slot = document.getElementById('class-attendance-slot').value;
    const count = document.getElementById('class-attendance-count').value;
    
    if (!date || !classId || !slot || !count) {
        system.showNotification('Please fill all fields!', 'error');
        return;
    }
    
    const classItem = system.classes.find(c => c.id === classId);
    if (parseInt(count) > classItem.strength) {
        system.showNotification(`Student count cannot exceed class capacity (${classItem.strength})!`, 'error');
        return;
    }
    
    system.addClassAttendance(date, classId, slot, count);
    
    // Reset form
    document.getElementById('class-attendance-class').value = '';
    document.getElementById('class-attendance-slot').value = '';
    document.getElementById('class-attendance-count').value = '';
}

function exportData(format) {
    system.exportData(format);
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    system = new LabManagementSystem();
});

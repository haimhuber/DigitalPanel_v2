async function getBreakersData() {
    try {
        const response = await fetch('http://localhost:5500/screens/breakersData');
        const result = await response.json();
        const myDiv = document.querySelector("#sql-data");
        myDiv.innerHTML = "";

        if (result.status === 500) {
            myDiv.textContent = "Server Error! Please check DB connection";
            return;
        }

        if (result.status === 200) {
            const data = result.data;
            if (Array.isArray(data) && data.length > 0) {
                data.forEach(item => {
                    const addValue = document.createElement('h3');
                    addValue.textContent = `${item.name} — ${item.ActiveEnergy} kWh`;
                    myDiv.appendChild(addValue);
                });
            } else {
                myDiv.textContent = "No data found.";
            }
        }

    } catch (err) {
        console.error('Error fetching data:', err);
        const myDiv = document.querySelector("#sql-data");
        myDiv.textContent = "Error fetching data. Check console.";
    }
}

getBreakersData();

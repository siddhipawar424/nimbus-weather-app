const url = 'https://weatherbit-v1-mashape.p.rapidapi.com/forecast/3hourly?lat=35.5&lon=-78.5&units=imperial&lang=en';
const options = {
	method: 'GET',
	headers: {
		'x-rapidapi-key': 'f59554ef94mshc1a7db4720b8173p183322jsne5ec580a6b2e',
		'x-rapidapi-host': 'weatherbit-v1-mashape.p.rapidapi.com'
	}
};

try {
	const response = await fetch(url, options);
	const result = await response.text();
	console.log(result);
} catch (error) {
	console.error(error);
}


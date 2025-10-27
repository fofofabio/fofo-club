import { NextResponse } from "next/server";

// We'll need to add the API key to environment variables
const API_KEY = process.env.WEATHER_API_KEY;
const BASE_URL = "https://api.openweathermap.org/data/2.5";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");

  if (!city) {
    return NextResponse.json({ error: "City parameter is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/forecast?q=${city}&units=metric&appid=${API_KEY}`
    );
    const data = await response.json();

    if (data.cod !== "200") {
      return NextResponse.json({ error: data.message }, { status: parseInt(data.cod) });
    }

    // Process the 3-hour forecasts into daily forecasts
    const dailyForecasts = data.list.reduce((acc: any[], forecast: any) => {
      const date = new Date(forecast.dt * 1000).toLocaleDateString();
      
      if (!acc.find((f: any) => new Date(f.dt * 1000).toLocaleDateString() === date)) {
        acc.push(forecast);
      }
      
      return acc;
    }, []).slice(0, 5); // Get only the first forecast of each day, up to 5 days

    return NextResponse.json({
      city: data.city,
      forecast: dailyForecasts
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
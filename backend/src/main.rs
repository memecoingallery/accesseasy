use actix_cors::Cors;
use actix_web::{get, web, App, HttpServer, Responder, HttpResponse};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Event {
    id: String,
    title: String,
    description: String,
    city: String,
    lat: f64,
    lon: f64,
    date: String,
    tags: String,
    url: String,
}

fn haversine_distance_km(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let to_rad = |deg: f64| deg.to_radians();
    let r = 6371.0_f64;
    let dlat = to_rad(lat2 - lat1);
    let dlon = to_rad(lon2 - lon1);
    let a = (dlat / 2.0).sin().powi(2)
        + to_rad(lat1).cos() * to_rad(lat2).cos() * (dlon / 2.0).sin().powi(2);
    2.0 * r * a.sqrt().atan2((1.0 - a).sqrt())
}

#[derive(Debug, Deserialize)]
struct QueryParams {
    lat: Option<f64>,
    lon: Option<f64>,
    radius: Option<f64>,
    q: Option<String>,
}

#[get("/api/events")]
async fn events(data: web::Data<Arc<Vec<Event>>>, web::Query(q): web::Query<QueryParams>) -> impl Responder {
    let mut list: Vec<Event> = data.as_ref().as_ref().clone();

    if let (Some(lat), Some(lon)) = (q.lat, q.lon) {
        let radius = q.radius.unwrap_or(10.0);
        list = list.into_iter().filter_map(|ev| {
            let d = haversine_distance_km(lat, lon, ev.lat, ev.lon);
            if d <= radius {
                // Optionally store distance in tags or description — keep model simple
                Some(ev)
            } else {
                None
            }
        }).collect();
    }

    if let Some(query) = q.q {
        let needle = query.to_lowercase();
        list = list.into_iter().filter(|ev| {
            (ev.title.clone() + " " + &ev.tags + " " + &ev.description + " " + &ev.city)
                .to_lowercase()
                .contains(&needle)
        }).collect();
    }

    HttpResponse::Ok().json(list)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    // Load events from file backend/data/events.json
    let raw = fs::read_to_string("backend/data/events.json").expect("events.json missing");
    let events_vec: Vec<Event> = serde_json::from_str(&raw).expect("invalid events.json");
    let shared = Arc::new(events_vec);

    HttpServer::new(move || {
        let cors = Cors::permissive();
        App::new()
            .wrap(cors)
            .app_data(web::Data::new(shared.clone()))
            .service(events)
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}

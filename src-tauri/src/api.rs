// Module API pour futures extensions
pub mod client {
    const API_URL: &str = "http://localhost:9999";

    pub async fn call(endpoint: &str) -> Result<String, String> {
        let url = format!("{}{}", API_URL, endpoint);
        reqwest::Client::new()
            .get(&url)
            .send()
            .await
            .map_err(|e| e.to_string())
            .and_then(|resp| {
                if resp.status().is_success() {
                    Ok("Success".to_string())
                } else {
                    Err("API error".to_string())
                }
            })
    }
}

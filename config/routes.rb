Rails.application.routes.draw do
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  root "catalog#index"
  resources :albums, only: [:show]
  resources :playlists, only: [:show]
end

class AlbumsController < ApplicationController
  # Always land on the SPA shell so Android Back only changes the hash (audio stays alive).
  def show
    redirect_to "#{root_path}#/albums/#{params[:id]}"
  end
end

class PlaylistsController < ApplicationController
  def show
    redirect_to "#{root_path}#/playlists/#{params[:id]}"
  end
end

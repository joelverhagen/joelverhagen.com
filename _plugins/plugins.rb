### Required Modules ###
require 'pathname'
require 'rubygems'
require 'json'
require 'time'

### Helper Methods ###
def cleanPath(path)
  Pathname.new(path).cleanpath.to_s
end

### Custom Filters ###
module CustomFilters

  LeadingZeros = /([^\d])0+(\d+)/
  def trim_leading_zeros(input)
    input.gsub LeadingZeros, '\1\2'
  end

  def json(input)
    input.to_json
  end

  def normalize_path(input)
    cleanPath(input)
  end

  def normalize_date(input)
    Time.parse(input.to_s).strftime("%Y-%m-%d")
  end
  
  Liquid::Template.register_filter self
end

### Custom Tags ###
class AttachmentLink < Liquid::Tag
  Syntax = /^\s*([^\s]+)/

  def initialize(tag_name, markup, tokens)
    super

    if markup =~ Syntax then
      @path = $1.strip
    else
      raise 'No attachment path was provided'
    end
  end

  def render(context)
    path = context.registers[:site].config['baseurl'] \
      + context.registers[:site].config['attachmentdir'] \
      + context.environments.first['page']['id'] \
      + '/' + @path

    cleanPath(path)
  end

  Liquid::Template.register_tag 'attachment', self
end

class Url < Liquid::Tag
  Syntax = /^\s*([^\s]+)/

  def initialize(tag_name, markup, tokens)
    super

    if markup =~ Syntax then
      @path = $1.strip
    else
      @path = ''
    end
  end

  def render(context)
    path = context.registers[:site].config['baseurl'] + '/' + @path

    cleanPath(path)
  end

  Liquid::Template.register_tag 'url', self
end

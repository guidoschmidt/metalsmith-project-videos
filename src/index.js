"use strict";

var debug = require("debug")("metalsmith-paths"),
  path = require("path"),
  fs = require("fs"),
  matcher = require("minimatch"),
  _ = require("lodash");

// Expose `plugin`.
module.exports = plugin;
module.exports.isAuthorizedFile = isAuthorizedFile;
module.exports.normalizeOptions = normalizeOptions;
module.exports.getMatchingFiles = getMatchingFiles;

/**
 *
 * @param {Object} options
 *   @property {String} pattern
 *   @property {String} imagesDirectory - directory in which we will go looking for images
 *   @property {String} authorizedExts - images authorized image extensions
 * @return {Function}
 */
function plugin(options) {
  return function innerFunction(files, metalsmith, done) {
    setImmediate(done);
    // sane default
    var optionsArray = [];
    if (_.isArray(options)) {
      // multiple options objects
      optionsArray = options;
    } else if (_.isObject(options)) {
      // one options object
      optionsArray = [options];
    }
    _.each(optionsArray, function(optionsItem) {
      addVideosToFiles(files, metalsmith, done, optionsItem);
    });
  };

  function addVideosToFiles(files, metalsmith, done, options) {
    // set options
    options = normalizeOptions(options);
    // get matching files
    var matchingFiles = getMatchingFiles(files, options.pattern);
    _.each(matchingFiles, function(file) {
      if (_.isUndefined(files[file])) return true;
      var videosPath = path.join(
        metalsmith.source(),
        path.dirname(file),
        options.videosDirectory
      );
      var exist = fs.existsSync(videosPath);
      // no access, skip the path
      if (!exist) return;
      var dirFiles = fs.readdirSync(videosPath);
      files[file][options.videosKey] = files[file][options.videosKey] || [];
      // add files as images metadata
      _.each(dirFiles, function(dirFile) {
        // check extension and remove thumbnails
        if (isAuthorizedFile(dirFile, options.authorizedExts)) {
          var videoPath = path.join(
            files[file].path.dir,
            options.videosDirectory,
            dirFile
          );
          files[file][options.videosKey].push(videoPath);
        }
      });
      files[file][options.videosKey] = _.uniq(files[file][options.videosKey]);
    });
  }
}

/**
 * @param {Object} options
 * @param {Array} authorized extensions - e.g ['jpg', 'png', 'gif']
 * @return {Object}
 */
function normalizeOptions(options) {
  // define options
  var defaultOptions = {
    authorizedExts: ["mp4", "MP4", "ogg", "OGG", "webm", "WEBM"],
    pattern: "**/*.md",
    videosDirectory: "videos",
    videosKey: "videos"
  };
  return _.extend(defaultOptions, options);
}

/**
 * @param {String} file
 * @param {Array} authorized extensions - e.g ['jpg', 'png', 'gif']
 * @return {Boolean}
 */
function isAuthorizedFile(file, authorizedExtensions) {
  // get extension
  var extension = file.split(".").pop();
  return _.includes(authorizedExtensions, extension);
}

/**
 * @param {Array} files
 * @param {String} pattern
 *
 */
function getMatchingFiles(files, pattern) {
  var keys = Object.keys(files);
  return _.filter(keys, function(file) {
    files[file].path = path.parse(file);
    // check if file is in the right path using regexp
    return matcher(file, pattern);
  });
}


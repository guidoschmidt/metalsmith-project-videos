"use strict";

const _ = require("lodash");
const path = require("path");
const fs = require("fs");
const assert = require("chai").assert;
const expect = require("chai").expect;
const Metalsmith = require("metalsmith");
const videos = require("../src/index.js");
const normalizeOptions = videos.normalizeOptions;
const getMatchingFiles = videos.getMatchingFiles;
const isAuthorizedFile = videos.isAuthorizedFile;

function getFilesWithVideos(files, videosKey) {
  videosKey = videosKey || "videos";
  return _.chain(files)
    .map(function(file, index, files) {
      var obj = {};
      obj[index] = file[videosKey];
      return obj;
    })
    .filter(function(file, index, files) {
      var key = Object.keys(file)[0];
      return !_.isUndefined(file[key]);
    })
    .value();
}

describe("metalsmith-videos", function() {
  describe("pure functions", function() {
    describe("#getMatchingFiles()", function() {
      it("should return matching files", function() {
        var files = {
          "projects/one.md": {},
          "projects/two.md": {},
          "projects/try.md": {},
          "projects/false.pdf": {}
        };

        var matchingFiles = getMatchingFiles(files, "**/*.md");
        assert.sameMembers(matchingFiles, [
          "projects/one.md",
          "projects/two.md",
          "projects/try.md"
        ]);
      });
    });

    describe("#normalizeOptions()", function() {
      it("should return an object", function() {
        var result = normalizeOptions({});
        expect(result).to.be.a("object");
      });

      it("should return default options when nothing is provided", function() {
        var result = normalizeOptions({});
        expect(result).to.eql({
          authorizedExts: ["mp4", "MP4", "ogg", "OGG", "webm", "WEBM"],
          pattern: "**/*.md",
          videosDirectory: "videos",
          videosKey: "videos"
        });
      });

      it("should extend default options with provided pattern", function() {
        var options = { pattern: "test/*.md" };
        var updatedOptions = normalizeOptions(options);
        expect(updatedOptions).to.eql({
          authorizedExts: ["mp4", "MP4", "ogg", "OGG", "webm", "WEBM"],
          pattern: "test/*.md",
          videosDirectory: "videos",
          videosKey: "videos"
        });
      });

      it("should extend default options with provided authorizedExts", function() {
        var options = { authorizedExts: ["mov"] };
        var updatedOptions = normalizeOptions(options);
        expect(updatedOptions).to.eql({
          authorizedExts: ["mov"],
          pattern: "**/*.md",
          videosDirectory: "videos",
          videosKey: "videos"
        });
      });

      it("should extend default options with provided imagesDirectory", function() {
        var options = { videosDirectory: "vids" };
        var updatedOptions = normalizeOptions(options);
        expect(updatedOptions).to.eql({
          authorizedExts: ["mp4", "MP4", "ogg", "OGG", "webm", "WEBM"],
          pattern: "**/*.md",
          videosDirectory: "vids",
          videosKey: "videos"
        });
      });
    });

    describe("#isAuthorizedFile()", function() {
      it("should return a boolean", function() {
        var result = isAuthorizedFile("filename.mp4", ["mp4", "ogg", "webm"]);
        expect(result).to.be.a("boolean");
      });

      it("should return true if file matches list of extensions", function() {
        var result = isAuthorizedFile("filename.jpg", ["jpg", "png", "gif"]);
        expect(result).to.equal(true);
      });

      it("should return false if file does not matches list of extensions", function() {
        var result = isAuthorizedFile("filename.jpeg", ["jpg", "png", "gif"]);
        // assert.equal(result, false);
        expect(result).to.equal(false);
      });
    });
  });

  describe("#plugin", function() {
    it("should add videos to metadata of matching files", function(done) {
      var metalsmith = Metalsmith("test/fixtures/pattern");
      metalsmith
        .use(videos({ pattern: "**/*.md" }))
        .build(function(err, files) {
          if (err) return done(err);
          console.log(files);
          var filesWithVideos = getFilesWithVideos(files);
          expect(filesWithVideos).to.deep.include.members([
            {
              "one/one.md": [
                "one/videos/blockbuster.mp4",
                "one/videos/blockbuster.ogg"
              ]
            },
            {
              "two/two.md": ["two/videos/movie.mp4", "two/videos/movie.ogg"]
            },
            { "three/three.md": ["three/videos/ad.webm"] }
          ]);
          done();
        });
    });

    it("should not add videos to metadata without matching directories", function(done) {
      var metalsmith = Metalsmith("test/fixtures/pattern");
      metalsmith
        .use(videos({ pattern: "**/*.md" }))
        .build(function(err, files) {
          if (err) return done(err);
          var filesWithImages = getFilesWithVideos(files);
          expect(filesWithImages).to.not.deep.include.members([
            { "four/four.md": [] }
          ]);
          done();
        });
    });

    it("should add videos to specified metadata key of matching files", function(done) {
      var metalsmith = Metalsmith("test/fixtures/pattern");
      metalsmith
        .use(videos({ pattern: "**/*.md", videosKey: "maps" }))
        .build(function(err, files) {
          if (err) return done(err);
          var filesWithVideos = getFilesWithVideos(files, "maps");
          expect(filesWithVideos).to.deep.include.members([
            {
              "one/one.md": [
                "one/videos/blockbuster.mp4",
                "one/videos/blockbuster.ogg"
              ]
            },
            {
              "two/two.md": ["two/videos/movie.mp4", "two/videos/movie.ogg"]
            },
            { "three/three.md": ["three/videos/ad.webm"] }
          ]);
          done();
        });
    });

    it("should add images matching the authorizedExts", function(done) {
      var metalsmith = Metalsmith("test/fixtures/pattern");
      metalsmith
        .use(videos({ pattern: "**/*.md", authorizedExts: ["mp4"] }))
        .build(function(err, files) {
          if (err) return done(err);
          var filesWithVideos = getFilesWithVideos(files);
          expect(filesWithVideos).to.deep.include.members([
            { "one/one.md": ["one/videos/blockbuster.mp4"] }
          ]);
          done();
        });
    });

    it("should accept multiple options (as an array)", function(done) {
      var metalsmith = Metalsmith("test/fixtures/pattern");
      metalsmith
        .use(
          videos([
            { pattern: "src/projects/*.md", authorizedExts: ["mov"] },
            { pattern: "**/*.md" }
          ])
        )
        .build(function(err, files) {
          if (err) return done(err);
          var filesWithVideos = getFilesWithVideos(files);
          expect(filesWithVideos).to.deep.include.members(
            [
            {
              "one/one.md": [
                "one/videos/blockbuster.mp4",
                "one/videos/blockbuster.ogg"
              ]
            },
            {
              "two/two.md": ["two/videos/movie.mp4", "two/videos/movie.ogg"]
            },
            {
              "three/three.md": ["three/videos/ad.webm"]
            },
            {
              "projects/hello/world.md": ["projects/hello/videos/simon.ogg"]
            }
          ]);
          done();
        });
    });
  });
});


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Geocaching {
    struct Cache {
        string name;
        string description;
        string coordinates;
        address owner;
        bool exists;
        bytes32 secretPhraseHash;
    }

    struct Log {
        address finder;
        uint256 timestamp;
        uint256[] trackablesAdded;
        uint256[] trackablesRemoved;
    }

    struct Trackable {
        string name;
        uint256 cacheId;
        address owner;
    }

    uint256 public nextCacheId;
    uint256 public nextTrackableId;

    mapping(uint256 => Cache) public caches;
    mapping(uint256 => Log[]) private _cacheLogs;
    mapping(uint256 => Trackable) public trackables;
    mapping(uint256 => bool) public cacheProblems;

    event CacheCreated(uint256 cacheId, string name, string coordinates, address owner);
    event CacheFound(uint256 cacheId, address finder, uint256[] trackablesAdded, uint256[] trackablesRemoved);
    event TrackableAdded(uint256 trackableId, string name, uint256 cacheId, address owner);
    event TrackableMoved(uint256 trackableId, uint256 oldCacheId, uint256 newCacheId, address newOwner);
    event CacheReported(uint256 cacheId, address reporter);

    function createCache(string memory name, string memory description, string memory coordinates, string memory secretPhrase) public {
        bytes32 secretPhraseHash = keccak256(abi.encodePacked(secretPhrase));
        caches[nextCacheId] = Cache(name, description, coordinates, msg.sender, true, secretPhraseHash);
        emit CacheCreated(nextCacheId, name, coordinates, msg.sender);
        nextCacheId++;
    }

    function logCacheFind(uint256 cacheId, uint256[] memory trackablesAdded, uint256[] memory trackablesRemoved, string memory secretPhrase) public {
        require(caches[cacheId].exists, "Cache does not exist");
        require(caches[cacheId].secretPhraseHash == keccak256(abi.encodePacked(secretPhrase)), "Incorrect secret phrase");
        for (uint256 i = 0; i < trackablesAdded.length; i++) {
            require(trackables[trackablesAdded[i]].cacheId == cacheId, "Trackable not in this cache");
        }
        for (uint256 i = 0; i < trackablesRemoved.length; i++) {
            require(trackables[trackablesRemoved[i]].cacheId == cacheId, "Trackable not in this cache");
            trackables[trackablesRemoved[i]].cacheId = 0; // Assume 0 means it's no longer in any cache
        }
        _cacheLogs[cacheId].push(Log(msg.sender, block.timestamp, trackablesAdded, trackablesRemoved));
        emit CacheFound(cacheId, msg.sender, trackablesAdded, trackablesRemoved);
    }

    function addTrackable(string memory name, uint256 cacheId) public {
        require(caches[cacheId].exists, "Cache does not exist");
        trackables[nextTrackableId] = Trackable(name, cacheId, msg.sender);
        emit TrackableAdded(nextTrackableId, name, cacheId, msg.sender);
        nextTrackableId++;
    }

    function moveTrackable(uint256 trackableId, uint256 newCacheId) public {
        require(trackables[trackableId].owner == msg.sender, "Only the owner can move the trackable");
        require(caches[newCacheId].exists, "New cache does not exist");
        uint256 oldCacheId = trackables[trackableId].cacheId;
        trackables[trackableId].cacheId = newCacheId;
        emit TrackableMoved(trackableId, oldCacheId, newCacheId, msg.sender);
    }

    function reportCacheProblem(uint256 cacheId) public {
        require(caches[cacheId].exists, "Cache does not exist");
        cacheProblems[cacheId] = true;
        emit CacheReported(cacheId, msg.sender);
    }

    function resolveCacheProblem(uint256 cacheId) public {
        require(caches[cacheId].owner == msg.sender, "Only the owner can resolve the problem");
        cacheProblems[cacheId] = false;
    }

    function getCacheLogs(uint256 cacheId) public view returns (Log[] memory) {
        return _cacheLogs[cacheId];
    }
}

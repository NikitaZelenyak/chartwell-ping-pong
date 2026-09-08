import { test } from "node:test";
import assert from "node:assert/strict";
import { nextSeasonName, seasonProgress, type Season } from "../lib/seasons";
import { dateTimeLocalToIso } from "../lib/datetime";
const season: Season = { id:"autumn",name:"Autumn 2026",starts_at:"2026-09-08T04:00:00.000Z",ends_at:"2026-12-08T05:00:00.000Z",status:"active",closed_at:null,champion_id:null,champion_team_id:null };
test("Autumn covers three Toronto calendar months across DST",()=>{
 assert.equal(dateTimeLocalToIso("2026-09-08T00:00"),season.starts_at);
 assert.equal(dateTimeLocalToIso("2026-12-08T00:00"),season.ends_at);
 assert.equal(nextSeasonName(season),"Winter 2026");
 assert.equal(nextSeasonName({...season,ends_at:"2027-03-08T05:00:00Z"}),"Spring 2027");
});
test("season progress clamps before opening and after closing",()=>{
 assert.equal(seasonProgress(season,Date.parse(season.starts_at)-1),0);
 assert.equal(seasonProgress(season,Date.parse(season.ends_at)+1),100);
 assert.equal(seasonProgress(season,(Date.parse(season.starts_at)+Date.parse(season.ends_at))/2),50);
});

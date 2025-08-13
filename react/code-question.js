
/**
 * @param {string} s 
 * @param {string} t 
 * @returns {boolean}
 */
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  if (s === t) return false;

  const map1 = new Map();
  const map2 = new Map();

  for (let i = 0; i < s.length; i++) {
    const c1 = s[i];
    const c2 = t[i];
    map1.set(c1, (map1.get(c1) || 0) + 1);
    map2.set(c2, (map2.get(c2) || 0) + 1);
  }

  for (const [key, value] of map1) {
    if (map2.get(key) !== value) return false;
  }

  return true;
}

// console.log(isAnagram('anagram', 'nagaram'));
// console.log(isAnagram('rat', 'cat'));
// console.log(isAnagram('a', 'a'));

/**
 * 
 * @param {string} s 
 * @param {string} t 
 * @returns {number}
 */
function minDistance(s, t) {}

/**
 * 
 * @param {number} x 
 * @returns {number}
 */
function mySqrt(x) {

  let result = 0;
  const getSquare = (num) => num * num;

  while(
    !(getSquare(result) <= x && getSquare(result + 1) > x)
  ) {
    result++;
  }

  return result;
}

/**
 * 
 * @param {number[]} nums 
 * @returns {number}
 */
function findRepeatNumber(nums) {
  let p0 = 0;
  let p1 = p0 + 1;

  while(p0 < (nums.length - 1)) {
    if(nums[p0] === nums[p1]) {
      return nums[p0];
    } else {
      p1++;
    }
    if (p1 > nums.length - 1) {
      p0++;
      p1 = p0 + 1;
    }
  }
  return -1;
}

/**
 * 
 * @param {number[]} nums 
 * @returns {number}
 */
var singleNumber = function(nums) {
  // const map = new Map();

  // nums.forEach((num) => {
  //   if (map.has(num)) {
  //     map.delete(num);
  //   } else {
  //     map.set(num, 1);
  //   }
  // })

  // return map.keys().next().value;

  return nums.reduce((prev, curr) => {
    return prev ^ curr;
  }, 0);
};


console.log(singleNumber([4,1,2,1,2]));
